import { LAMPORTS_PER_SOL, Keypair, Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// anchor.setProvider(anchor.AnchorProvider.env());
// const connection = anchor.getProvider().connection;
const connection = new Connection('http://127.0.0.1:8899');

const randomPayer = async (lamports = LAMPORTS_PER_SOL) => {
    const wallet = Keypair.generate();
    const signature = await connection.requestAirdrop(wallet.publicKey, lamports);
    await connection.confirmTransaction(signature);
    return wallet;
}

export {
    randomPayer
}
