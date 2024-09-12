import express from 'express';
const app = express()
const { IncrementalMerkleTree } = require('merkletreejs')
const { buildPoseidon } = require('circomlibjs')

// respond with "hello world" when a GET request is made to the homepage
app.get('/', async (req: any, res: any) => {
    const _poseidon = await buildPoseidon();

    const poseidon = (inputs: any) => {
        const hash = _poseidon(inputs.map(IncrementalMerkleTree.bigNumberify))
        const bn = IncrementalMerkleTree.bigNumberify(_poseidon.F.toString(hash))
        return bn
    }

    const tree = new IncrementalMerkleTree(poseidon, {
        depth: 2,
        arity: 2,
        zeroValue: BigInt(0)
    })

    tree.insert(poseidon([BigInt(2)]))

    res.send(tree.getRoot().toString())
})

app.listen(9789, () => {
    console.log(`Example app listening on port ${9789}`)
})