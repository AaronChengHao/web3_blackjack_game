'use client'

import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit';


function App() {

  console.log("组件渲染Kaishi ");
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♤", ",♡", "♢", "♧"];

  const initialDeck = ranks.map((rank) => suits.map((suit) => ({ rank, suit }))).flat();

  const [deck, setDeck] = useState<{ rank: string, suit: string }[]>([]);
  const [winner, setWinner] = useState("");
  const [message, setMessage] = useState("");
  const [playerHand, setPlayerHand] = useState<{ rank: string, suit: string }[]>([]);
  const [dealerHand, setDealerHand] = useState<{ rank: string, suit: string }[]>([]);
  const [score, setScore] = useState(0);
  const { address, isConnected } = useAccount();
  const [isSigned, setIsSigned] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const initGame = async () => {
    const response = await fetch(`/api?address=${address}`);
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  useEffect(() => {
    console.log("useEffect");
  }, []);


  async function handleHit() {
    const response = await fetch(`/api?address=${address}`, {
      method: "POST",
      body: JSON.stringify({
        action: "hit",
        address
      }),
    });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  async function handleStand() {
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify({
        action: "stand",
        address
      }),
    });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  async function handleReset() {
    const response = await fetch(`/api?address=${address}`);
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  async function handleSign() {
    const message = `welcome to the game black jack at ${new Date().toString()}`
    const signature = await signMessageAsync({ message });
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify({
        action: "auth",
        address,
        message,
        signature,
      }),
    });

    if (response.status === 200) {
      setIsSigned(true);
      initGame();
    }
  }

  console.log("页面组件渲染", isSigned);
  if (!isSigned) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
        <ConnectButton />
        <button onClick={handleSign} className="border-black bg-amber-300 p-2 rounded-md">Sign with your wallet</button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
        <ConnectButton />
        {/* <button onClick={handleSign} className="border-black bg-amber-300 p-2 rounded-md">Sign with your wallet</button> */}
        <h1 className="text-3xl bold">Welcome to web3 game black jack</h1>
        <h2 className={`text-3xl bold ${message.includes("win") ? "bg-green-300" : "bg-amber-300"}`}>Score: {score} {message}</h2>
        <div className="mt-4"></div>
        <div>
          <h2>Dealer hand</h2>
          <div className="flex flex-row gap-2">
            {
              dealerHand.map((card, index) => {
                return (
                  <div key={index} v-for="card, index in initialDeck.slice(0, 3)"
                    className="w-32 h-42 border-1 border-black  bg-white rounded-md flex flex-col justify-between">
                    <p className="self-start p-2 text-lg">{card.rank}</p>
                    <p className="self-center p-2 text-3xl">{card.suit}</p>
                    <p className="self-end p-2 text-lg">{card.rank}</p>
                  </div>
                )
              })
            }
          </div>
        </div>

        <div>
          <h2>player hand</h2>
          <div className="flex flex-row gap-2">
            {
              playerHand.map((card, index) => {
                return (
                  <div key={index} v-for="card, index in initialDeck.slice(0, 3)"
                    className="w-32 h-42 border-1 border-black  bg-white rounded-md flex flex-col justify-between">
                    <p className="self-start p-2 text-lg">{card.rank}</p>
                    <p className="self-center p-2 text-3xl">{card.suit}</p>
                    <p className="self-end p-2 text-lg">{card.rank}</p>
                  </div>
                )
              })
            }
          </div>
        </div>

        <div className="flex flex-row gap-2 mt-4">

          {
            message.length == 0 ? (
              <>
                <button onClick={handleHit} className="bg-amber-300 rounded-md p-2"> hit</button>
                <button onClick={handleStand} className="bg-amber-300 rounded-md p-2"> stand </button>
              </>
            ) : (
              <button onClick={handleReset} className="bg-amber-300 rounded-md p-2"> reset </button>
            )

          }
          {/* <button onClick={handleHit} className="bg-amber-300 rounded-md p-2"> hit</button> */}
          {/* <button onClick={handleStand} className="bg-amber-300 rounded-md p-2"> stand </button> */}
          {/* <button onClick={handleReset} className="bg-amber-300 rounded-md p-2"> reset </button> */}
        </div>
      </div>
    </>
  )
}

export default App
