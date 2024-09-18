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
        const name_hash_hex = BigInt('0x' + sha256(name));
        console.log("NAME", name_hash_hex)
    
        // Generisanje korisničkog heša
        const userHash = this.poseidon([name_hash_hex, pid, pub_x, pub_y]);
    
        return userHash;
    }
    


    public registerUser(name: string, pid: number, pub_x: number, pub_y: number): void {
        const userHash = this.generateUserHash(name, pid, pub_x, pub_y);

        if (this.tree !== undefined) {
            this.tree.insert(userHash);

            // Write user into file
            const index = this.tree.indexOf(userHash);
            fs.appendFileSync(FILE_NAME, `${name} ${pid} ${index}\n`);

            console.log('User hash:', userHash); // Debug output
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
        console.log(hashes)
        return hashes;
    }
}

function testMerkleProof(regulator: Regulator) {
    const name = "Nikola";
    const pid = 1234567891234;
    const pub_x = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    const pub_y = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

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
    const pub_x = 3888576901777170289421589198162014583316338054584738763549834494791884717082;
    const pub_y = 19725565301010062238652593058005193447661094791735349142110963933738384313931;

    //  const p = BigInt(21888242871839275222246405745257275088548364400416034343698204186575808495617);
    //  const l = BigInt(2736030358979909402780800718157159386076813972158567259200215660948447373041);

    //  14286942789459266288728506834874719885884871879898147527888937849006820603176 

    //  const reducedPublicX = BigInt(pub_x) % p;
    //  const reducedPublicY = BigInt(pub_y) % p;

    //  const reducedPublicX2 =BigInt(21347281496116813001536291755483085154849108347354186272260828276046640621836) % l;
    //  const reducedPublicY2 = BigInt(8872397783154522094478226767098399945682972775736833551971462278740617756665) % l;

    //  const reducedPriv = BigInt(53814628616955579277451670290121642763927928917457232858356346073015676178961) % l;

    //  const some = BigInt(19872812680560909620535710920847893968459574804983378854575488785829987466816) % l;

    //  const ujko = BigInt(14744269619966411208579211824598458697587494354926760081771325075741142829156) % l;


    //  console.log("Reduced priv:", reducedPriv);
    //  console.log("burazer:", some);
    //  console.log("ujko:", ujko);


     


    //  console.log("Reduced publicX:", reducedPublicX);
    //  console.log("Reduced publicY:", reducedPublicY);

    //  console.log("Reduced publicX:", reducedPublicX2);
    //  console.log("Reduced publicY:", reducedPublicY2);



    res.registerUser(name, pid, pub_x, pub_y);
     res.registerUser(name, pid, Number(5299619240641551281634865583518297030282874472190772894086521144482721001553), 
     Number(16950150798460657717958625567821834550301663161624707787222815936182638968203));

    const name_hash_hex = BigInt('0x' + sha256(name));
    console.log("NAME", name_hash_hex)

    // console.log(res.poseidon([name_hash_hex,
    //     pid,
    //     reducedPublicX,
    //     reducedPublicY
    // ]))

    // Save Merkle tree to JSON
    res.saveTreeWithParentsToFile('merkle_tree.json');

    // Read JSON
    res.loadTreeWithParentsFromFile('merkle_tree.json');

    // Print MT
    IncrementalMerkleTree.print(res.tree);
    

    if (res.tree !== undefined) {
        const result = testMerkleProof(res);
        console.log(result);
    }

    const l = BigInt(2736030358979909402780800718157159386076813972158567259200215660948447373041);

    console.log(BigInt(5299619240641551281634865583518297030282874472190772894086521144482721001553) % l)
    console.log(BigInt(16950150798460657717958625567821834550301663161624707787222815936182638968203) % l)

    console.log(res.poseidon([name_hash_hex, 1234567891234, BigInt(5299619240641551281634865583518297030282874472190772894086521144482721001553) % l,
        BigInt(16950150798460657717958625567821834550301663161624707787222815936182638968203) % l
    ]))
});


