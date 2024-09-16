import express, { Express, Request, Response } from 'express';
import { IncrementalMerkleTree } from 'merkletreejs';
import * as fs from 'fs';
const { PublicKey, PrivateKey } = require('babyjubjub');


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

    public poseidon(inputs: any) {
        const bigIntInputs = inputs.map(IncrementalMerkleTree.bigNumberify);
        console.log("Converted input ", bigIntInputs);
        const hash = this._poseidon(bigIntInputs);
        const bn = IncrementalMerkleTree.bigNumberify(this._poseidon.F.toString(hash))
        return bn
    }

    private generateUserHash(name: string, pid: number, pub_x: number, pub_y: number) {
        // calculating hash of name
        let name_number: string = "";
        for (let i = 0; i < name.length; i++) {
            name_number += name.charCodeAt(i).toString();
        }
        const name_hash = this.poseidon([name_number]);

        // calculating user hash
        return this.poseidon([name_hash, pid, pub_x, pub_y]);
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
    
        const hash1 = "3de07b2978ff113f7b853ea9590475e53320dbb731150264142a3f4618e8bd9";
        const hash2 = "2d93927060ea68025d8cc1bf545522eccd3dc36036b3c4b903b21e4842d527ac";

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
