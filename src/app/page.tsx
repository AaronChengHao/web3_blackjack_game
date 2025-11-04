'use client'

import { useAccount, useSignMessage } from 'wagmi'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { createPublicClient, createWalletClient, custom, getContract } from 'viem';
import { sepolia } from 'viem/chains';
import { nftABI } from './abi';

function App() {
  console.log("组件渲染开始");

  const [playerHand, setPlayerHand] = useState<{ rank: string, suit: string }[]>([]);
  const [dealerHand, setDealerHand] = useState<{ rank: string, suit: string }[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const { address } = useAccount();
  const [isSigned, setIsSigned] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const [publicClient, setPublicClient] = useState<any>();
  const [walletClient, setWalletClient] = useState<any>();

  // Loading states
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [isLoadingHit, setIsLoadingHit] = useState(false);
  const [isLoadingStand, setIsLoadingStand] = useState(false);
  const [isLoadingReset, setIsLoadingReset] = useState(false);
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);
  const [isLoadingSign, setIsLoadingSign] = useState(false);

  const initGame = async () => {
    setIsLoadingGame(true);
    try {
      const response = await fetch(`/api?address=${address}`);
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);

      if (typeof window !== "undefined" && window.ethereum) {
        const _publicClient = createPublicClient({
          transport: custom(window.ethereum),
          chain: sepolia,
        });

        const _walletClient = createWalletClient({
          transport: custom(window.ethereum),
          chain: sepolia,
          account: address,
        });
        setWalletClient(() => _walletClient);
        setPublicClient(() => _publicClient);
      }
    } catch (error) {
      console.error("Failed to initialize game:", error);
    } finally {
      setIsLoadingGame(false);
    }
  };

  async function handleSendTx() {
    setIsLoadingNFT(true);
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      const nftContract = getContract({
        address: contractAddress as `0x${string}`,
        abi: nftABI,
        client: {
          public: publicClient,
          wallet: walletClient,
        },
      }) as any;
      const tx = await nftContract.write.safeMint([address]);
      console.log("交易hash:", tx);
    } catch (error) {
      console.error("Failed to mint NFT:", error);
    } finally {
      setIsLoadingNFT(false);
    }
  }

  useEffect(() => {
    console.log("useEffect");
  }, []);

  async function handleHit() {
    setIsLoadingHit(true);
    try {
      const response = await fetch(`/api?address=${address}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
        },
        body: JSON.stringify({
          action: "hit",
          address,
        }),
      });
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
    } catch (error) {
      console.error("Failed to hit:", error);
    } finally {
      setIsLoadingHit(false);
    }
  }

  async function handleStand() {
    setIsLoadingStand(true);
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
        },
        body: JSON.stringify({
          action: "stand",
          address,
        }),
      });
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
    } catch (error) {
      console.error("Failed to stand:", error);
    } finally {
      setIsLoadingStand(false);
    }
  }

  async function handleReset() {
    setIsLoadingReset(true);
    try {
      const response = await fetch(`/api?address=${address}`);
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
    } catch (error) {
      console.error("Failed to reset:", error);
    } finally {
      setIsLoadingReset(false);
    }
  }

  async function handleSign() {
    setIsLoadingSign(true);
    try {
      const message = `welcome to the game black jack at ${new Date().toString()}`;
      const signature = await signMessageAsync({ message });
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
        },
        body: JSON.stringify({
          action: "auth",
          address,
          message,
          signature,
        }),
      });

      if (response.status === 200) {
        const { jsonwebtoken } = await response.json();
        localStorage.setItem("jwt", jsonwebtoken);
        setIsSigned(true);
        initGame();
      }
    } catch (error) {
      console.error("Failed to sign:", error);
    } finally {
      setIsLoadingSign(false);
    }
  }

  // Get card color based on suit
  const getCardColor = (suit: string) => {
    return suit === "♡" || suit === "♢" ? "text-red-600" : "text-gray-900";
  };

  // Get card background based on card state
  const getCardBackground = (isPlayerTurn: boolean = true) => {
    return isPlayerTurn ? "bg-white" : "bg-white/95";
  };

  console.log("页面组件渲染", isSigned);

  if (!isSigned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold text-yellow-400 animate-pulse-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.7)]">
              🎰 21点 🎰
            </h1>
            <p className="text-xl text-gray-300 mt-4">Web3 赌场游戏</p>
          </div>

          <div className="flex flex-col gap-6 items-center mt-12">
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700 shadow-2xl">
              <ConnectButton />
            </div>
            <button
              onClick={handleSign}
              disabled={isLoadingSign}
              className="px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 shadow-lg hover:shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed min-w-[240px] transform hover:scale-105 transition-all duration-300"
            >
              {isLoadingSign ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-gray-900 border-r-transparent"></span>
                  签名中...
                </span>
              ) : (
                "🔐 用钱包签名"
              )}
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 py-8">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 px-4 relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
          🎰 21点
        </h1>
        <div className="bg-gray-800/50 backdrop-blur-sm p-2 rounded-xl border border-gray-700 shadow-lg">
          <ConnectButton />
        </div>
      </div>

      {/* Score and Message */}
      <div className={`rounded-2xl px-8 py-4 text-center shadow-lg transition-all duration-500 transform hover:scale-[1.02] ${message.toLowerCase().includes("win")
        ? "bg-green-600/90 text-white shadow-green-500/25 border border-green-500/50"
        : "bg-gray-800/70 text-gray-200 border border-gray-700"
        } w-full max-w-md mx-auto backdrop-blur-sm relative z-10`}>
        <h2 className="text-2xl md:text-3xl font-bold">
          分数: {score} {message && `• ${message}`}
        </h2>
      </div>

      {/* NFT Mint Button */}
      {message.toLowerCase().includes("win") && (
        <button
          onClick={handleSendTx}
          disabled={isLoadingNFT}
          className="px-6 py-3 rounded-xl text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-gold min-w-[200px] transform hover:scale-105 transition-all duration-300 relative z-10"
        >
          {isLoadingNFT ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
              铸造NFT中...
            </span>
          ) : (
            "🏆 领取你的胜利NFT！"
          )}
        </button>
      )}

      {/* Game Area */}
      <div className="w-full max-w-4xl space-y-12 bg-gray-800/40 rounded-3xl p-8 backdrop-blur-md border border-gray-700/50 shadow-2xl relative z-10 transform hover:shadow-lg transition-all duration-300">
        {/* Dealer Hand */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-300 text-center">
            庄家手牌
          </h2>
          <div className="flex flex-wrap justify-center gap-3 min-h-[180px]">
            {isLoadingGame ? (
              <div className="flex items-center justify-center w-full">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-yellow-400 border-r-transparent"></span>
              </div>
            ) : (
              dealerHand.map((card, index) => (
                <div
                  key={index}
                  className="w-28 h-40 md:w-32 md:h-44 border-2 border-gray-300 rounded-xl flex flex-col justify-between p-3 animate-card-deal bg-white shadow-lg transform hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <p className={`self-start text-lg md:text-xl font-bold ${getCardColor(card.suit)}`}>
                    {card.rank}
                  </p>
                  <p className={`self-center text-4xl md:text-5xl ${getCardColor(card.suit)}`}>
                    {card.suit}
                  </p>
                  <p className={`self-end text-lg md:text-xl font-bold ${getCardColor(card.suit)} rotate-180`}>
                    {card.rank}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-300 text-center">
            你的手牌
          </h2>
          <div className="flex flex-wrap justify-center gap-3 min-h-[180px]">
            {isLoadingGame ? (
              <div className="flex items-center justify-center w-full">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-yellow-400 border-r-transparent"></span>
              </div>
            ) : (
              playerHand.map((card, index) => (
                <div
                  key={index}
                  className="w-28 h-40 md:w-32 md:h-44 border-2 border-yellow-400/50 rounded-xl flex flex-col justify-between p-3 animate-card-deal bg-white shadow-lg shadow-yellow-500/10 transform hover:scale-110 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <p className={`self-start text-lg md:text-xl font-bold ${getCardColor(card.suit)}`}>
                    {card.rank}
                  </p>
                  <p className={`self-center text-4xl md:text-5xl ${getCardColor(card.suit)}`}>
                    {card.suit}
                  </p>
                  <p className={`self-end text-lg md:text-xl font-bold ${getCardColor(card.suit)} rotate-180`}>
                    {card.rank}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {message.length === 0 ? (
            <>
              <button
                onClick={handleHit}
                disabled={isLoadingHit || isLoadingStand}
                className="px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] transform hover:scale-105 transition-all duration-300"
              >
                {isLoadingHit ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-white border-r-transparent"></span>
                    要牌
                  </span>
                ) : (
                  "🎴 要牌"
                )}
              </button>
              <button
                onClick={handleStand}
                disabled={isLoadingHit || isLoadingStand}
                className="px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] transform hover:scale-105 transition-all duration-300"
              >
                {isLoadingStand ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-white border-r-transparent"></span>
                    停牌
                  </span>
                ) : (
                  "✋ 停牌"
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleReset}
              disabled={isLoadingReset}
              className="px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] transform hover:scale-105 transition-all duration-300"
            >
              {isLoadingReset ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-white border-r-transparent"></span>
                  重置中...
                </span>
              ) : (
                "🔄 新游戏"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer with address */}
      {address && (
        <div className="mt-8 text-gray-400 text-sm font-mono bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700/50">
          你的地址: {address.substring(0, 6)}...{address.substring(address.length - 4)}
        </div>
      )}
    </div>
  );
}

export default App;