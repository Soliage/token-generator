import { PublicKey } from "@solana/web3.js";

export type TokenWrapper = {
    mintAddress: PublicKey; // token address
    tokenAccount: PublicKey; // recipient's token account
}