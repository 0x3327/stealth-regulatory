import express, { Express, Request, Response } from 'express';
import { IncrementalMerkleTree } from 'merkletreejs';
import * as fs from 'fs';
import { sha256, sha224 } from 'js-sha256';


const { buildPoseidon } = require('circomlibjs');
const FILE_NAME = "registered_users";

class Regulator {
    public server: Express;
    public tree: IncrementalMerkleTree | undefined;
    public _poseidon: any;

    constructor() {
        this.server = express();
    }

    public async init() {
        this._poseidon = await buildPoseidon();
        this.tree = new IncrementalMerkleTree(this.poseidon.bind(this), {
            depth: 2,
            arity: 2,
            zeroValue: BigInt(0)
        });
    }

<<<<<<< HEAD
    public poseidon(inputs: any) {
        const bigIntInputs = inputs.map(IncrementalMerkleTree.bigNumberify);
        console.log("Converted input ", bigIntInputs);
=======
    /*
    *   Function expects inputs to be hexadecimal strings
    */
    public poseidon(inputs: any[]): bigint {
        const bigIntInputs = inputs.map(input => BigInt('0x' + input));
>>>>>>> 5c40d2e (added comments)
        const hash = this._poseidon(bigIntInputs);
        const bn = IncrementalMerkleTree.bigNumberify(this._poseidon.F.toString(hash))
        return bn
    }

    private generateUserHash(name: string, pid: number, pub_x: number, pub_y: number) {
        // Heširanje imena
        const name_hash_hex = sha256(name);
        const name_hash_bigint = BigInt('0x' + name_hash_hex);
        console.log("Name hash (BigInt):", name_hash_bigint.toString(16));
    
        // Generisanje korisničkog heša
        const userHash = this.poseidon([name_hash_bigint, BigInt(pid), BigInt(pub_x), BigInt(pub_y)]);
        console.log("User hash:", userHash.toString(16));
    
        return userHash;
    }
    


    public registerUser(name: string, pid: number, pub_x: number, pub_y: number): void {
        const userHash = this.generateUserHash(name, pid, pub_x, pub_y);

        if (this.tree !== undefined) {
            this.tree.insert(userHash);

            // Write user into file
            const index = this.tree.indexOf(userHash);
            fs.appendFileSync(FILE_NAME, `${name} ${pid} ${index}\n`);

            console.log('User hash:', userHash.toString(16)); // Debug output
            console.log('User inserted at index:', index); // Debug output
        }
    }


    public checkDuplicate(name: string, pid: number, pub_x: number, pub_y: number): any {
        if (!fs.existsSync(FILE_NAME)) {
            return "File does not exist";
        }

        const fileData = fs.readFileSync(FILE_NAME, 'utf-8');
        const lines = fileData.split('\n');

        for (const line of lines) {
            const data = line.split(' ');
            if (data.length > 1 && Number(data[1]) === pid) {
                const newIndex: number = parseInt(data[2], 10);
                const leaves = this.tree?.getLeaves();
                const leafAtIndex = leaves?[newIndex]:-1;
                return leafAtIndex;
            }
        }

        this.registerUser(name, pid, pub_x, pub_y);
    }
}



async function testing() {
    const regulator: Regulator = new Regulator();
    await regulator.init();
    return regulator;
}

testing().then((res) => {
    const name = "Nikola";
    const pid = 1234567891234;
    const pub_x = 7849177681360672621257726786949079749092629607596162839195961972852243798387;
    const pub_y = 6476520406570543146511284735472598280851241629796745672331248892171436291770;

    res.registerUser(name, pid, pub_x, pub_y);
    res.registerUser("Pavle", 2345678912345, 8729176218460562548973127896482079481359769801452716493125971962853443910295, 9328416529780431261879424985573099310275416289943765812297619982154127390826);

    IncrementalMerkleTree.print(res.tree);

    if (res.tree !== undefined) {
        console.log();
        console.log(res.tree.getProof(0));  // Merkle proof for the first leaf
    
        console.log("------ Testing Merkle Proof -------");
    
        const hash1 = "124d16aca9112afef51af19d8ea640fddc0441f87b9fe7dad3e7739973e7f752";
        const hash2 = "2e4e6f64b65b4f03813694d121f0af21c10d6be6e07b3dd60d2f54b47b265523";

        const hash1BigInt = BigInt('0x' + hash1);
        const hash2BigInt = BigInt('0x' + hash2);
        
        const name_hash1 = res.poseidon([hash1BigInt]);
        const name_hash2 = res.poseidon([hash2BigInt]);
        
        // Računaj roditeljski heš na ispravan način
        const parent_hash = res.poseidon([hash1BigInt, hash2BigInt]);
        
        const sibling_hash = "2098f5fb9e239eab3ceac3f27b81e481dc3124d55ffed523a839ee8446b64864";

        const parent_hash2 = "17a3cbf091cad9c8486fbeb0e5ff29efb38d35affb022075fb2da89d64f80b37";

        const sibling_hashBigInt = BigInt('0x' + sibling_hash)

        const parent_hashBigInt = BigInt('0x' + parent_hash2)


        // Računaj root koristeći parent_hash i sibling_hash
        const calculatedRoot = res.poseidon([
            parent_hash, sibling_hashBigInt
        ]);

        console.log("Calculated root is", calculatedRoot.toString(16));
        console.log("True root is", res.tree.getRoot().toString(16));
    }
});
