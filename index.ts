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
            depth: 3,
            arity: 2,
            zeroValue: BigInt(0)
        });
    }

    public poseidon(inputs: any[]): bigint {
        const bigIntInputs = inputs.map(input => BigInt('0x' + input));
        const hash = this._poseidon(bigIntInputs);
        return BigInt(this._poseidon.F.toString(hash));
    }

    private generateUserHash(name: string, pid: number, pub_x: number, pub_y: number): bigint {
        const nameHex = Buffer.from(name, 'utf-8').toString('hex');
        const nameHash = this.poseidon([nameHex]);

        return this.poseidon([nameHash.toString(16), pid.toString(16), pub_x.toString(16), pub_y.toString(16)]);
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
    const regulator = new Regulator();
    await regulator.init();
    return regulator;
}

testing().then((res) => {
    const name = "Nikola";
    const name2 = "Niole";
    const name3 = "Nikle";
    const name4 = "Nikoe";
    const name5 = "Nikol";

    const pid = 1234567891238;
    const pid2 = 1234567891234;
    const pid3 = 1234567891235;
    const pid4 = 1234567891236;
    const pid5 = 1234567891237;

    const pidToCheck = 1234567891230;

    let sk = PrivateKey.getRandObj().field;
    //get PrivateKey object from field(or hexstring)
    let privKey = new PrivateKey(sk);
    //get PublicKey object from privateKey object
    let pubKey = PublicKey.fromPrivate(privKey);

    const pub_x = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    const pub_y = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

    res.registerUser(name, pid, pub_x, pub_y);
    res.registerUser(name2, pid2, pub_x, pub_y);
    res.registerUser(name3, pid3, pub_x, pub_y);
    res.registerUser(name4, pid4, pub_x, pub_y);
    res.registerUser(name5, pid5, pub_x, pub_y);
 


    console.log(res.checkDuplicate(name, pidToCheck, pub_x, pub_y));
});
