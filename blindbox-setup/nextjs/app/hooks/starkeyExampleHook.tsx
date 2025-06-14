/*
* This was taken directly from Crystara's implementation.
* It uses secure cookies via httpOnly and secure flags.
* 
* Uses jose for JWT verification.
* Uses tweetnacl for signing and verifying messages.
* Uses ethers for parsing units and sending transactions.
* Uses next/navigation for routing.
* 
* Ive included the necessary API routes in the app/(api) folder.
* 
* Your tasks are to refactor this hook to work with the "Choose a wallet to connect with" modal, and make the JWT system wallet agnostic.
* 
*/

import { useState, useEffect, useRef } from "react";
import nacl from "tweetnacl";
import { ethers } from "ethers"; // Assuming you are using ethers.js
import { useRouter} from 'next/navigation';
import { toast } from "@/app/components/ui/use-toast";

// Define a custom event name
export const WALLET_EVENTS = {
  CONNECTED: 'wallet-connected'
} as const;

const useStarkeyWallet = () => {
  const router = useRouter();
  //const searchParamsRef = useRef<URLSearchParams>();
  //const searchParams = useSearchParams();
  const [supraProvider, setSupraProvider] = useState<any>(typeof window !== "undefined" && (window as any)?.starkey?.supra);

  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean>(!!supraProvider);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [networkData, setNetworkData] = useState<any>();
  const [balance, setBalance] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [justRequestedRelative, setJustRequestedRelative] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<{ hash: string }[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<string>("");

  const addTransactions = (hash: string) => {
    setTransactions((prev) => [{ hash }, ...prev]);
  };

  useEffect(()=>{
      updateAccounts().then();
  },[isExtensionInstalled])

  useEffect(() => {
    const checkExtension = () => {
        const provider = typeof window !== "undefined" && (window as any)?.starkey?.supra;
        if (provider) {
            setSupraProvider(provider);
            setIsExtensionInstalled(true);
            return true;
        }
        return false;
    };

    if (checkExtension()) return;

    const intv = setInterval(() => {
        if (checkExtension()) clearInterval(intv);
    }, 1000);
    setTimeout(() => {
        clearInterval(intv);
    }, 5000)

    return () => clearInterval(intv);
}, []);

  //useEffect(() => {
  //  searchParamsRef.current = searchParams;
  //}, [searchParams]);

  const checkIsExtensionInstalled = () => {
    const intervalId = setInterval(() => {
      if ((window as any)?.starkey) {
        setSupraProvider((window as any)?.starkey.supra);
        clearInterval(intervalId);
        setIsExtensionInstalled(true);
        updateAccounts().then();
      }
    }, 500);

    setTimeout(() => clearInterval(intervalId), 5000);
  };

  const updateAccounts = async () => {
    if (supraProvider) {
      try {
        const responseAcc = await supraProvider.account();
        setAccounts(responseAcc.length > 0 ? responseAcc : []);
        localStorage.setItem("starkey.accounts.0", responseAcc[0]);
        await updateBalance();
        await getNetworkData();
      } catch {
        setAccounts([]);
        localStorage.removeItem("starkey.accounts.0");
      }
    }
  };

  const updateBalance = async () => {
    if (supraProvider && accounts.length) {
      const balance = await supraProvider.balance();
      if (balance) {
        setBalance(`${balance.formattedBalance} ${balance.displayUnit}`);
      }
    } else {
      setBalance("");
    }
  };

  const getNetworkData = async () => {
    if (supraProvider) {
      const data = await supraProvider.getChainId();
      setNetworkData(data || {});

      return data;
    }
  };

  const connectWallet = async () => {
    if(!supraProvider){
      toast({
        title: "Extension not installed",
        description: "Please install the Starkey extension",
        variant: "destructive"
      });
      return false;
    }
    setLoading(true);
    try {
      console.log("connecting wallet");
      await supraProvider.connect();
      await updateAccounts();
      const responseAcc = await supraProvider.account();
      if (responseAcc.length) {
        localStorage.setItem("isSigningWallet", "false");
        fetch('/api/account/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            walletAddress: responseAcc[0],
          })
        });
        localStorage.setItem("starkey.accounts.0", responseAcc[0]);

        let networkData = await getNetworkData();
        console.log("networkData", networkData);
        if(networkData.chainId !== process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID){
          setSelectedChainId(()=>process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID || "6");
          await switchToChain(process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID || "6");
        }

        console.log("responseAcc", responseAcc);
        const nonce = await fetch('/api/auth/nonce').then(r => r.text());
        console.log("nonce", nonce);
        const signature = await signMessage("Sign message to login to Crystara",nonce, responseAcc[0]);
        console.log("signature", signature);

        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: responseAcc[0],
            signature,
            nonce
          })
        });
        
        const { token } = await response.json();
        
        // Set the secure HttpOnly cookie via API
        await fetch('/api/starkey/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        // Dispatch custom event after successful connection
        window.dispatchEvent(new CustomEvent(WALLET_EVENTS.CONNECTED, {
          detail: {
            timestamp: Date.now(),
            account: responseAcc[0]
          }
        }));


      }
    } catch (error) {
      
      console.error('Connect error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
      return true;
    }
  };

  const disconnectWallet = async () => {
    if (supraProvider) {
      await supraProvider.disconnect();
      console.log("removing authToken");
      
      // Call API to remove HttpOnly cookie
      await fetch('/api/starkey/logout', { method: 'POST' });
      
      resetWalletData();
      router.push('/');
    }
  };

  const resetWalletData = () => {
    setAccounts([]);
    setBalance("");
    setNetworkData({});
    localStorage.setItem("isSigningWallet", "false");
    localStorage.removeItem("starkey.accounts.0");
  };

  const sendTransaction = async (to: string, value: bigint, data = "") => {
    if (!supraProvider || !accounts.length || !networkData) return;

    setLoading(true);
    const tx = {
      from: accounts[0],
      to,
      value: ethers.parseUnits(value.toString(), 8).toString(),
      data,
      chainId: networkData.chainId,
    };

    const txHash = await supraProvider.sendTransaction(tx);
    addTransactions(txHash || "failed");
    setLoading(false);
    return txHash;
  };

  const sendRawTransaction = async (
    moduleAddress?: string,
    moduleName?: string,
    functionName?: string,
    params?: any[],
    runTimeParams: any[] = [],
    txExpiryTime: number = Math.ceil(Date.now() / 1000) + 3000
  ) => {
    if (!supraProvider || !accounts.length || !moduleAddress || !moduleName || !functionName) {
        console.error("Invalid transaction parameters:", {
            supraProvider,
            accounts,
            moduleAddress,
            moduleName,
            functionName,
            params,
            runTimeParams
        });
        return;
    }

    let networkData = await getNetworkData();
    console.log("networkData", networkData);
    let changeNetworkResult = null;
    if(networkData.chainId !== process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID){
      setSelectedChainId(()=>process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID || "6");
      changeNetworkResult = await supraProvider.changeNetwork({chainId:process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID || "6"});
    }

    const rawTxPayload = [
      accounts[0],
      0, // sequence number
      moduleAddress,
      moduleName,
      functionName,
      runTimeParams,
      params,
      {  }
    ];

    const data = await supraProvider.createRawTransactionData(rawTxPayload);
    console.log("data", data);
    const txHash = await supraProvider.sendTransaction({
      data,
      from: accounts[0],
      to: moduleAddress,
      chainId: process.env.NEXT_PUBLIC_SUPRA_CHAIN_ID || "6",
      value: "",
    });

    addTransactions(txHash || "failed");
    console.log("txHash", txHash);
    return txHash;
  };

  const signMessage = async (message: string, nonce = "12345", account?: any, forceSign = false) => {
    if (!supraProvider) return;
    if(!accounts.length && !account) return;
    if(!accounts.length && account){
      accounts[0] = account;
    }
    if(localStorage.getItem("isSigningWallet") === "true" && !forceSign){
      return;
    }
    localStorage.setItem("isSigningWallet", "true");

    console.log("signing message", message, nonce, account);

    const hexMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
    const response = await supraProvider.signMessage({ message: hexMessage, nonce });

    const { publicKey, signature } = response;
    console.log("publicKey", publicKey);
    console.log("signature", signature);
    console.log("response", response);
    const verified = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      Uint8Array.from(Buffer.from(signature.slice(2), "hex")),
      Uint8Array.from(Buffer.from(publicKey.slice(2), "hex"))
    );

    localStorage.setItem("isSigningWallet", "false");
    return { ...response, verified };
  };

  const signIn = async () => {
    if (supraProvider && accounts.length) {
      const nonce = await fetch('/api/auth/nonce').then(r => r.text());
      const signature = await signMessage("Sign message to revalidate login to Crystara", nonce, accounts[0]);
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: accounts[0],
          signature,
          nonce
        })
      });
      
      const { token: newToken } = await response.json();
      localStorage.setItem('authToken', newToken);
      document.cookie = `authToken=${newToken}; path=/; max-age=${60*60*24}; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''} HttpOnly`;

      // Dispatch custom event after successful revalidation
      window.dispatchEvent(new CustomEvent(WALLET_EVENTS.CONNECTED, {
        detail: {
          token: newToken,
          timestamp: Date.now(),
          account: accounts[0]
        }
      }));
      }
  }

  // Update the token revalidation function
  const checkAndRevalidateToken = async () => {
    try {
      // Check if user is authenticated by making a lightweight auth check request
      const response = await fetch('/api/auth/check', { 
        method: 'GET',
        credentials: 'include' // Important to include cookies
      });
      
      if (!response.ok) {
        // Token is invalid or expired, need to re-authenticate
        if (supraProvider && accounts.length && !justRequestedRelative) {
          const nonce = await fetch('/api/auth/nonce').then(r => r.text());
          setJustRequestedRelative(true);
          const signature = await signMessage("Token Expiry: Sign message to revalidate login to Crystara", nonce, accounts[0]);
          
          const authResponse = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: accounts[0],
              signature,
              nonce
            })
          });
          setJustRequestedRelative(false);
          
          const { token } = await authResponse.json();
          
          // Set the secure HttpOnly cookie via API
          await fetch('/api/starkey/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });

          // Dispatch custom event after successful revalidation
          window.dispatchEvent(new CustomEvent(WALLET_EVENTS.CONNECTED, {
            detail: {
              timestamp: Date.now(),
              account: accounts[0]
            }
          }));

          return true;
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Add periodic check for token validation
  useEffect(() => {
    if (accounts.length > 0) {
      const checkInterval = setInterval(checkAndRevalidateToken, 86400000); // Check every day
      return () => clearInterval(checkInterval);
    }
  }, [accounts]);

  // Modify authFetch to include credentials for cookies
  const authFetch = async (url: string, options: RequestInit = {}) => {
    // First check if token is valid
    const isValid = await checkAndRevalidateToken();
    if (!isValid) {
      throw new Error('Authentication failed');
    }

    // Include credentials to send cookies with the request
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
      }
    });
  };

  // Add revalidation check to existing functions that require auth
  const likeBox = async (boxId: string) => {
    if (!accounts.length) throw new Error('Wallet not connected');
    
    const isValid = await checkAndRevalidateToken();
    if (!isValid) {
      throw new Error('Authentication failed');
    }
    
    return authFetch('/api/account/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxId })
    });
  };

  useEffect(() => {
    const handleExtensionEvents = (event: any) => {
      if (event?.data?.name?.startsWith("starkey-")) {
        console.log("StarKey Event :: ", event.data);
        switch (event?.data?.name) {
          case "starkey-extension-installed":
            checkIsExtensionInstalled();
            break;

          case "starkey-wallet-updated":
            // Handle account changes
            (async () => {
              // Check if user is authenticated
              const authCheckResponse = await fetch('/api/auth/check', { 
                credentials: 'include' 
              });
              if (authCheckResponse.ok) {
                                // Clear old auth
                console.log("removing authToken");
                
                // Call API to remove HttpOnly cookie
                await fetch('/api/starkey/logout', { method: 'POST' });
              } // If not logged in, we don't need to switch accounts
              
              const responseAcc = await supraProvider.account();
              if (responseAcc.length) {
                setAccounts(responseAcc);
                try {
                  fetch('/api/account/login', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      walletAddress: responseAcc[0],
                    })
                  });

                  const nonce = await fetch('/api/auth/nonce').then(r => r.text());
                  const signResult = await signMessage("Sign this message to login to Crystara", nonce, responseAcc[0]);

                  if (!signResult) {
                    return;
                  }

                  // Now safely destructure
                  const { signature } = signResult;
                  
                  const authResponse = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      address: responseAcc[0],
                      signature,
                      nonce
                    })
                  });
                  
                  const { token } = await authResponse.json();
                  
                  // Set the secure HttpOnly cookie via API
                  await fetch('/api/starkey/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                  });

                  window.dispatchEvent(new CustomEvent(WALLET_EVENTS.CONNECTED, {
                    detail: {
                      timestamp: Date.now(),
                      account: responseAcc[0]
                    }
                  }));
                  
                  await updateAccounts();
                } catch (error) {
                  console.error('Account switch auth error:', error);
                  toast({
                    title: "Authentication Failed",
                    description: "Failed to authenticate new account",
                    variant: "destructive"
                  });
                }
              } else {
                resetWalletData();
                router.push('/');
              }
              setLoading(false);
            })();
            break;

          case "starkey-wallet-disconnected":
            resetWalletData();
            router.push('/');
            setLoading(false);
            break;

          case "starkey-window-removed":
            setLoading(false);
            break;
        }
      }
    };

    checkIsExtensionInstalled();
    window.addEventListener("message", handleExtensionEvents);
    return () => window.removeEventListener("message", handleExtensionEvents);
  }, [supraProvider]);

  const switchToChain = async (chainId?: string) => {
    if (selectedChainId && supraProvider) {
        await supraProvider.changeNetwork({chainId:chainId || selectedChainId});
        await getNetworkData()
    }
    };

  const getSupraProvider = () => {
    return supraProvider;
  }

  return {
    getSupraProvider,
    isExtensionInstalled,
    accounts,
    networkData,
    balance,
    transactions,
    selectedChainId,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    sendRawTransaction,
    signMessage,
    setSelectedChainId,
    switchToChain,
    loading,
    authFetch,
    likeBox,
    checkAndRevalidateToken,
    signIn
  };
};

export default useStarkeyWallet;