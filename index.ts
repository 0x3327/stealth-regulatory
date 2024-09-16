import express, { Express, Request, Response } from 'express';
import { IncrementalMerkleTree } from 'merkletreejs';
import * as fs from 'fs';
import { sha256 } from 'js-sha256';


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

    public poseidon(inputs: any[]): BigInt {
        const bigIntInputs = inputs.map(IncrementalMerkleTree.bigNumberify);
        const hash = this._poseidon(bigIntInputs);
        const bn = IncrementalMerkleTree.bigNumberify(this._poseidon.F.toString(hash))
        return bn
    }

    public generateUserHash(name: string, pid: number, pub_x: number, pub_y: number) {
        // Heširanje imena
        const name_hash_hex = sha256(name);
    
        // Generisanje korisničkog heša
        const userHash = this.poseidon(['0x' + name_hash_hex, pid, pub_x, pub_y]);
    
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

    public saveTreeWithParentsToFile(filePath: string): void {
        if (this.tree !== undefined) {
            const leaves = this.tree.getLeaves().map((leaf) => leaf.toString(16));
            const root = this.tree.getRoot().toString(16);
            const parents: string[] = [];
    
            // Calculating parents hash
            for (let i = 0; i < leaves.length; i += 2) {
                if (i + 1 < leaves.length) {
                    const leftLeaf = BigInt('0x' + leaves[i]);
                    const rightLeaf = BigInt('0x' + leaves[i + 1]);
                    const parentHash = this.poseidon([leftLeaf, rightLeaf]).toString(16);
                    parents.push(parentHash);
                }
            }
    
            const treeData = {
                leaves: leaves,
                parents: parents,
                root: root
            };
    
            // Convert to JSON and save
            fs.writeFileSync(filePath, JSON.stringify(treeData, null, 2));
            console.log(`Merkle tree with parents saved to ${filePath}`);
        }
    }
    

    public loadTreeWithParentsFromFile(filePath: string): void {
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf-8');
            const treeData = JSON.parse(fileData);

            this.tree = new IncrementalMerkleTree(this.poseidon.bind(this), {
                depth: 2,
                arity: 2,
                zeroValue: BigInt(0)
            });
    
            // Add leaves
            treeData.leaves.forEach((leaf: string) => {
                this.tree?.insert(BigInt('0x' + leaf));
            });
    
            // Write parents
            console.log("Parents:", treeData.parents);
    
            console.log(`Merkle tree with parents loaded from ${filePath}`);
        } else {
            console.log(`File ${filePath} does not exist.`);
        }
    }
    
    // function that returns list of hashes and their indexes
    // needed to generate merkle proof
    public getMerkleProof(leafIndex: number): any[] {
        let hashes = [];
        if (this.tree !== undefined) {
            const proof = this.tree.getProof(leafIndex);
            for (let i = 0; i < proof.siblings.length; i++) {
                hashes.push([proof.siblings[i][0], proof.pathIndices[i]]);
            }
        }
        return hashes;
    }
}

function testMerkleProof(regulator: Regulator) {
    const name = "Nikola";
    const pid = 1234567891234;
    const pub_x = 7849177681360672621257726786949079749092629607596162839195961972852243798387;
    const pub_y = 6476520406570543146511284735472598280851241629796745672331248892171436291770;

    const proof = regulator.getMerkleProof(0);

    let hash = regulator.generateUserHash(name, pid, pub_x, pub_y);
    for (let i = 0; i < proof.length; i++) {
        let second_hash = proof[i][0];
        let index = proof[i][1];

        if (index == 0) {
            hash = regulator.poseidon([hash, second_hash]);
        }
        else {
            hash = regulator.poseidon([second_hash, hash]);
        }
    }

    if (regulator.tree !== undefined)
        return console.log(regulator.tree.getRoot() === hash);
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

    /*
    // Save Merkle tree to JSON
    res.saveTreeWithParentsToFile('merkle_tree.json');

    // Read JSON
    res.loadTreeWithParentsFromFile('merkle_tree.json');

    // Print MT
    IncrementalMerkleTree.print(res.tree);
    */

    if (res.tree !== undefined) {
        const result = testMerkleProof(res);
        console.log(result);
    }
});


