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

  console.log("页面组件渲染", isSigned);

  if (!isSigned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
        <div className="text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold text-primary animate-pulse-gold">
              🎰 BLACKJACK 🎰
            </h1>
            <p className="text-xl text-foreground/80">Web3 Casino Game</p>
          </div>

          <div className="flex flex-col gap-4 items-center mt-8">
            <ConnectButton />
            <button
              onClick={handleSign}
              disabled={isLoadingSign}
              className="btn-casino px-8 py-4 rounded-xl text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[240px]"
            >
              {isLoadingSign ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-current border-r-transparent"></span>
                  Signing...
                </span>
              ) : (
                "🔐 Sign with Your Wallet"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 py-8">
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-primary">
          🎰 BLACKJACK
        </h1>
        <ConnectButton />
      </div>

      {/* Score and Message */}
      <div className={`rounded-2xl px-8 py-4 text-center shadow-lg transition-all duration-300 ${message.toLowerCase().includes("win")
        ? "score-win text-success-foreground"
        : "bg-secondary text-secondary-foreground"
        }`}>
        <h2 className="text-2xl md:text-3xl font-bold">
          Score: {score} {message && `• ${message}`}
        </h2>
      </div>

      {/* NFT Mint Button */}
      {message.toLowerCase().includes("win") && (
        <button
          onClick={handleSendTx}
          disabled={isLoadingNFT}
          className="btn-casino px-6 py-3 rounded-xl text-base font-bold text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-gold"
        >
          {isLoadingNFT ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
              Minting NFT...
            </span>
          ) : (
            "🏆 Claim Your NFT!"
          )}
        </button>
      )}

      {/* Game Area */}
      <div className="w-full max-w-4xl space-y-12 bg-secondary/30 rounded-3xl p-8 backdrop-blur-sm">
        {/* Dealer Hand */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground/90 text-center">
            Dealer's Hand
          </h2>
          <div className="flex flex-wrap justify-center gap-3 min-h-[180px]">
            {isLoadingGame ? (
              <div className="flex items-center justify-center w-full">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></span>
              </div>
            ) : (
              dealerHand.map((card, index) => (
                <div
                  key={index}
                  className="playing-card w-28 h-40 md:w-32 md:h-44 border-2 border-gray-200 bg-card rounded-xl flex flex-col justify-between p-3 animate-card-deal"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <p className={`self-start text-lg md:text-xl font-bold ${getCardColor(card.suit)}`}>
                    {card.rank}
                  </p>
                  <p className={`self-center text-4xl md:text-5xl ${getCardColor(card.suit)}`}>
                    {card.suit}
                  </p>
                  <p className={`self-end text-lg md:text-xl font-bold ${getCardColor(card.suit)}`}>
                    {card.rank}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground/90 text-center">
            Your Hand
          </h2>
          <div className="flex flex-wrap justify-center gap-3 min-h-[180px]">
            {isLoadingGame ? (
              <div className="flex items-center justify-center w-full">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></span>
              </div>
            ) : (
              playerHand.map((card, index) => (
                <div
                  key={index}
                  className="playing-card w-28 h-40 md:w-32 md:h-44 border-2 border-gray-200 bg-card rounded-xl flex flex-col justify-between p-3 animate-card-deal"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <p className={`self-start text-lg md:text-xl font-bold ${getCardColor(card.suit)}`}>
                    {card.rank}
                  </p>
                  <p className={`self-center text-4xl md:text-5xl ${getCardColor(card.suit)}`}>
                    {card.suit}
                  </p>
                  <p className={`self-end text-lg md:text-xl font-bold ${getCardColor(card.suit)}`}>
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
                className="btn-casino px-8 py-4 rounded-xl text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              >
                {isLoadingHit ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-current border-r-transparent"></span>
                    Hit
                  </span>
                ) : (
                  "🎴 Hit"
                )}
              </button>
              <button
                onClick={handleStand}
                disabled={isLoadingHit || isLoadingStand}
                className="btn-casino px-8 py-4 rounded-xl text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              >
                {isLoadingStand ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-current border-r-transparent"></span>
                    Stand
                  </span>
                ) : (
                  "✋ Stand"
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleReset}
              disabled={isLoadingReset}
              className="btn-casino px-8 py-4 rounded-xl text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
            >
              {isLoadingReset ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-solid border-current border-r-transparent"></span>
                  Resetting...
                </span>
              ) : (
                "🔄 New Game"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
