import Redis from 'ioredis';
import { verifyMessage } from "viem";
import jwt from 'jsonwebtoken';

// 初始化 Redis 客户端（根据实际 Redis 配置修改）
const redisClient = new Redis({
    host: '192.168.123.125',    // Redis 服务器地址（默认本地）
    port: 6379,           // Redis 端口（默认 6379）
    password: 'redis_EXtJkJ',         // 若 Redis 有密码，填写此处
    db: 7,                // 数据库编号（默认 0）
    retryStrategy: (times) => {
        // 重试策略：失败后重试，重试间隔递增（最多重试 10 次）
        return Math.min(times * 50, 2000);
    }
});

// 监听连接错误
redisClient.on('error', (err) => {
    console.error('Redis 连接错误:', err);
});

/**
 * 向 Redis 写入键值对
 * @param key 键名
 * @param value 存储的值（自动转为字符串）
 * @param expireSeconds 过期时间（可选，单位：秒）
 */
async function setRedisValue(
    key: string,
    value: string | number | boolean,
    expireSeconds?: number
): Promise<boolean> {
    try {
        // 转换值为字符串（Redis 只存储字符串）
        const stringValue = String(value);

        if (expireSeconds) {
            // 带过期时间的写入
            await redisClient.set(key, stringValue, 'EX', expireSeconds);
        } else {
            // 永久存储
            await redisClient.set(key, stringValue);
        }

        console.log(`成功写入 Redis: key=${key}, value=${stringValue}`);
        return true;
    } catch (err) {
        console.error(`写入 Redis 失败 (key=${key}):`, err);
        return false;
    }
}

/**
 * 从 Redis 读取值
 * @param key 键名
 * @returns 存储的值（不存在则返回 null）
 */
async function getRedisValue(key: string): Promise<string | null> {
    try {
        const value = await redisClient.get(key);
        if (value !== null) {
            console.log(`读取 Redis 成功: key=${key}, value=${value}`);
        } else {
            console.log(`Redis 中未找到 key=${key}`);
        }
        return value;
    } catch (err) {
        console.error(`读取 Redis 失败 (key=${key}):`, err);
        return null;
    }
}

// 示例用法
async function main() {
    // 写入示例：存储用户分数，设置 1 小时（3600 秒）后过期
    await setRedisValue('user:alice:score', 95, 3600);

    // 读取示例
    const aliceScore = await getRedisValue('user:alice:score');
    console.log('Alice 的分数:', aliceScore); // 输出 "95"

    // 读取不存在的键
    const bobScore = await getRedisValue('user:bob:score');
    console.log('Bob 的分数:', bobScore); // 输出 null

    // 关闭连接（实际项目中按需关闭，如程序退出时）
    redisClient.quit();
}

// 执行示例
// main();


export interface Card {
    rank: string;
    suit: string;
}


const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suits = ["♤", ",♡", "♢", "♧"];

const initialDeck = ranks.map((rank) => suits.map((suit) => ({ rank, suit }))).flat();

const gameState: {
    playerHand: Card[];
    dealerHand: Card[];
    deck: Card[];
    message: string;
    score: number;
} = {
    playerHand: [],
    dealerHand: [],
    deck: initialDeck,
    message: "",
    score: 0
};


function getRandomCards(deck: Card[], count: number) {
    const randomIndexSet = new Set<number>();
    while (randomIndexSet.size < count) {
        randomIndexSet.add(Math.floor(Math.random() * deck.length));
    }

    const randomCards = deck.filter((_, index) => randomIndexSet.has(index));

    const remainingDeck = deck.filter((_, index) => !randomIndexSet.has(index));
    return [randomCards, remainingDeck];
}

const DEFAULT_PLAYER = "player";


export async function GET(request: Request) {
    const url = new URL(request.url);
    const address = url.searchParams.get("address");
    if (!address) {
        return Response.json({
            message: "address is required",
        }, {
            status: 400,
        })
    }

    gameState.playerHand = [];
    gameState.dealerHand = [];
    gameState.deck = initialDeck;
    gameState.message = "";



    const [playerCards, remainingDeck] = getRandomCards(gameState.deck, 2);
    const [dealerCards, remainingDeck2] = getRandomCards(remainingDeck, 2);

    gameState.playerHand = playerCards;
    gameState.dealerHand = dealerCards;
    gameState.deck = remainingDeck2;
    gameState.message = "";

    const data = await getRedisValue(address);
    gameState.score = Number(data);
    return Response.json({
        playerHand: gameState.playerHand,
        dealerHand: [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card],
        // deck: gameState.deck,
        message: gameState.message,
        score: gameState.score
    })
}


export async function POST(req: Request) {
    const body = await req.json();
    const { action, address, message, signature } = body;
    if (action === "auth") {
        const isValid = await verifyMessage({ address, message, signature });
        if (!isValid) {
            return Response.json({
                message: "invalid signature",
            }, {
                status: 401,
            })
        } else {
            const token = jwt.sign({ address }, process.env.JWT_SECRET!, { expiresIn: "1h" });
            return Response.json({
                message: "auth success",
                jsonwebtoken: token,
            }, {
                status: 200,
            })
        }
    }
    const token = req.headers.get("Authorization")?.split(" ")[1] || "";
    if (!token) {
        return Response.json({
            message: "token is required",
        }, {
            status: 401,
        })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { address: string };
    if (decoded.address.toLocaleLowerCase() !== address.toLocaleLowerCase()) {
        return Response.json({
            message: "invalid token",
        }, {
            status: 401,
        })
    }


    if (action === "hit") {
        const [cards, remainingDeck] = getRandomCards(gameState.deck, 1);
        gameState.playerHand.push(...cards);
        gameState.deck = remainingDeck;
        const playerHandValue = calculateHandValue(gameState.playerHand);
        if (playerHandValue === 21) {
            gameState.message = "player wins";
            gameState.score += 100;
        } else if (playerHandValue > 21) {
            gameState.message = "player loses";
            gameState.score -= 100;
        }
    } else if (action === "stand") {
        while (calculateHandValue(gameState.dealerHand) < 17) {
            const [cards, remainingDeck] = getRandomCards(gameState.deck, 1);
            gameState.dealerHand.push(...cards);
            gameState.deck = remainingDeck;
        }

        const dealerHandValue = calculateHandValue(gameState.dealerHand);
        if (dealerHandValue > 21) {
            gameState.message = "player wins";
            gameState.score += 100;
        } else if (dealerHandValue === 21) {
            gameState.message = "player loses";
            gameState.score -= 100;
        } else {
            const playerHandValue = calculateHandValue(gameState.playerHand);
            if (playerHandValue > dealerHandValue) {
                gameState.message = "player wins";
                gameState.score += 100;
            } else if (playerHandValue < dealerHandValue) {
                gameState.message = "player loses";
                gameState.score -= 100;
            } else {
                gameState.message = "draw";
            }
        }
    } else {
        return Response.json({
            message: "invalid action",
        })
    }

    await setRedisValue(address, gameState.score);

    return new Response(JSON.stringify({
        playerHand: gameState.playerHand,
        dealerHand: gameState.message === "" ? [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card] : gameState.dealerHand,
        // deck: gameState.deck,
        message: gameState.message,
        score: gameState.score
    }), {
        headers: {
            "Content-Type": "application/json",
        },
    })
}


function calculateHandValue(hand: Card[]) {
    let value = 0;
    let aceCount = 0;
    for (const card of hand) {
        if (card.rank === "A") {
            aceCount++;
            value += 11;
        } else if (["J", "Q", "K"].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }
    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }
    return value;
}