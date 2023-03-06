import { LAMPORTS_PER_SOL, Keypair, Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// anchor.setProvider(anchor.AnchorProvider.env());
// const connection = anchor.getProvider().connection;
const connection = new Connection('http://127.0.0.1:8899');

const randomPayer = async (lamports = LAMPORTS_PER_SOL) => {
    const wallet = Keypair.generate();
    const signature = await connection.requestAirdrop(wallet.publicKey, lamports);
    await connection.confirmTransaction(signature);
    return wallet;
}

async function getWalletAddress(connection: Connection, tokenAccount: string): Promise<PublicKey> {
    let pubkey: PublicKey = new PublicKey('a');
    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        {
            filters: [
            {
                dataSize: 165, // number of bytes
            },
            {
                memcmp: {
                offset: 0, // number of bytes
                bytes: tokenAccount, // base58 encoded string
                },
            },
            ],
        }
    );

    accounts.forEach((account, i) => {
        const parsedAccountInfo:any = account.account.data;
        const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        if (tokenBalance > 0) {
            pubkey = parsedAccountInfo["parsed"]["info"]['owner'];
        }
    });
    return pubkey
}

export {
    randomPayer,
    getWalletAddress,
}
