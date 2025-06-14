"use client";

import { BlindBoxPage, WALLET_EVENTS } from 'crystara-sdk';
import { walletEvents } from 'crystara-sdk';
import useStarkeyWallet from '@/app/hooks/starkeyExampleHook';
import { useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { motion } from 'framer-motion';
export function BlindBoxClient() {

  //Your Wallet Logic Goes Here
  const starkey = useStarkeyWallet();

  useEffect(() => {
    // Flag to prevent duplicate emissions
    let hasEmittedForTransaction = false;

    const transactionStartEvent = async (event: any) => {
      if (!event || !event.contractAddress || !event.moduleName || !event.functionName) {
        console.error("Invalid transaction event data:", event);
        return;
      }
      
      // Keep the original parameter order exactly as it was
      const moduleAddress = event.contractAddress;
      const moduleName = event.moduleName;
      const functionName = event.functionName;
      const params = event.args || []; 
      const runTimeParams = event.typeArgs || [];
      
      try {
        // Reset the flag for new transactions
        hasEmittedForTransaction = false;
        
        // Call the sendRawTransaction method with the extracted parameters
        const tx = await starkey.sendRawTransaction(
          moduleAddress,
          moduleName,
          functionName,
          params,
          runTimeParams
        );
        
        // Only emit once per transaction
        if (tx && !hasEmittedForTransaction) {
          hasEmittedForTransaction = true;
          console.log("Transaction successful:", tx);
          walletEvents.emit(WALLET_EVENTS.TRANSACTION_SUCCESS, {txHash: tx});
        }
      } catch (error) {
        console.error("Transaction failed:", error);
      }
    };

    const toastHandler = (event: any) => {
      console.log("Notification received:", event);
      if(event.type === "win") {
        showCustomWinningToast(event);
      }
    };
    
    // Subscribe to wallet events
    const unsubscribe = walletEvents.on(WALLET_EVENTS.TRANSACTION_START, transactionStartEvent);
    const unsubscribe2 = walletEvents.on(WALLET_EVENTS.NOTIFICATION, toastHandler);
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      unsubscribe2();
    };
  }, [starkey]);

  const showCustomWinningToast = (event: any) => {
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="bg-brand-dark p-6 rounded-lg shadow-xl"
      >
        <h3 className="text-xl font-bold text-white mb-2">Congratulations!</h3>
        <img
          src={event.image || ''} 
          alt={event.name} 
          className="w-32 h-32 object-cover rounded-lg mb-2"
        />
        <p className="text-white">{event.name}</p>
        <p className="text-gray-400">{event.rarity}</p>
      </motion.div>
    ), {
      duration: 3500,
    });
  }

  // Create wrapper functions that will call the server actions
  const fetchMetadata = async (url: string) => {
    const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    return response.json();
  };
  
  const fetchLootboxStats = async (url: string, viewer?: string) => {
    const response = await fetch(`/api/lootbox?url=${encodeURIComponent(url)}${viewer ? `&viewer=${viewer}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch lootbox stats');
    return response.json();
  };

  const batchFetchMetadata = async (urls: string[], bustCache?: boolean) => {
    const response = await fetch('/api/batch-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls, bustCache }),
    });
    if (!response.ok) throw new Error('Failed to batch fetch metadata');
    return response.json();
  };

  const fetchLootboxInfo = async (lootboxCreatorAddress: string, collectionName: string, viewerAddress: string | null) => {
    const response = await fetch('/api/lootbox-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lootboxCreatorAddress, collectionName, viewerAddress }),
    });
    if (!response.ok) throw new Error('Failed to fetch lootbox info');
    return response.json();
  };

  const fetchWhitelistAmount = async (lootboxCreatorAddress: string, collectionName: string, currentAddress: string) => {
    const response = await fetch('/api/whitelist-amount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lootboxCreatorAddress, collectionName, currentAddress }),
    });
    if (!response.ok) throw new Error('Failed to fetch whitelist amount');
    return response.json();
  };

  return (
    <div className="min-h-screen bg-black">
      <BlindBoxPage 

        //Server Side Params
        params={{
          contractAddress: process.env.NEXT_PUBLIC_CRYSTARA_ADR || "",
          contractModuleName: process.env.NEXT_PUBLIC_COLLECTIONS_MODULE_NAME || "",
          supraRPCUrl: process.env.NEXT_PUBLIC_SUPRA_RPC_URL || "",

          //Lootbox URL on Crystara
          lootboxUrl: "uglies",
          // Current wallet address connected to the page.
          viewerAddress: starkey.accounts[0],
          //Sounds for blind box rolling.
          sounds:
          {
            "open": "/sounds/opencrate.mp3",
            "win": "/sounds/woosh.wav",
            "tick": "/sounds/cratetick.mp3",
            "error": "/sounds/error.mp3"
          }
        }}
        fetchMetadata={fetchMetadata}
        fetchLootboxStats={fetchLootboxStats}
        batchFetchMetadata={batchFetchMetadata}
        fetchLootboxInfo={fetchLootboxInfo}
        fetchWhitelistAmount={fetchWhitelistAmount}
      />
      <Toaster />
    </div>
  );
}