import express, { Express, Request, Response } from 'express';
import { IncrementalMerkleTree } from 'merkletreejs';
import * as fs from 'fs';

const { buildPoseidon } = require('circomlibjs')
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
        })
    }

    /*
    *   Function expects inputs to be decimal numbers, or strings that can
    *   be converted to a decimal number
    */
    public poseidon(inputs: any) {
        const bigIntInputs = inputs.map(IncrementalMerkleTree.bigNumberify);
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

    public registerUser(name: string, pid: number, pub_x: number, pub_y: number) {
        const user_hash = this.generateUserHash(name, pid, pub_x, pub_y);
        console.log(`Hash of ${name} is `, user_hash);
        if (this.tree !== undefined) {
            this.tree.insert(user_hash);

            // write user into file
            fs.appendFileSync(FILE_NAME, name + " " + pid + 
                " " + this.tree.indexOf(user_hash).toString() + '\n');
        }

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
        console.log()
        console.log(res.tree.getProof(0));
    
        console.log("------ Testing Merkle Proof -------");
    
        const hash1: BigInt = 20614815389456477269622376490749609717305042994180078292278868320083221227436n;
        const hash2: BigInt = 1749231721186905000331905189205193995387117199992888763390662983390862412761n;
    
        const concat_hash: string = hash1.toString() + hash2.toString();
    
        const parent_hash = res.poseidon([hash2, hash1]);
        const sibling_hash: BigInt = 14744269619966411208579211824598458697587494354926760081771325075741142829156n;
        console.log(parent_hash);
    
        console.log("Root is", res.poseidon([
            parent_hash,
            sibling_hash
        ]));
        console.log("True root is", res.tree.getRoot());
    }
});
