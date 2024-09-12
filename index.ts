import express, { Express, Request, Response } from 'express';
import { IncrementalMerkleTree } from 'merkletreejs';

const { buildPoseidon } = require('circomlibjs')

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

    public poseidon(inputs: any) {
        const hash = this._poseidon(inputs.map(IncrementalMerkleTree.bigNumberify))
        const bn = IncrementalMerkleTree.bigNumberify(this._poseidon.F.toString(hash))
        return bn
    }

    public registerUser(name: string, pid: number, pub_x: number, pub_y: number) {

        // calculating hash of name
        let name_number: string = "";
        for (let i = 0; i < name.length; i++) {
            name_number += name.charCodeAt(i).toString();
        }
        const name_hash = this.poseidon([name_number]);

        // calculating user hash
        const user_hash = this.poseidon([name_hash, pid, pub_x, pub_y]);

        console.log("User hash is: ", user_hash.toString(16));

        if (this.tree !== undefined)
            this.tree.insert(user_hash);
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

    IncrementalMerkleTree.print(res.tree);
});
