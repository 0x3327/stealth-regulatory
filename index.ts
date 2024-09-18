import express, { Express, Request, Response } from 'express';
import { IncrementalMerkleTree } from 'merkletreejs';
import * as fs from 'fs';
import { sha256 } from 'js-sha256';

import Regulator from "./regulator";

async function testing() {
    const usersFile: string = "registered_users";
    const regulator: Regulator = new Regulator(usersFile);
    await regulator.init();
    return regulator;
}

testing().then((res) => {
    const merkleTreeFile = "merkle_tree.json";

    res.loadTreeFromFile(merkleTreeFile);
    // const name = "Nikola";
    // const pid = 1234567891234;
    // const pub_x = 7849177681360672621257726786949079749092629607596162839195961972852243798387;
    // const pub_y = 6476520406570543146511284735472598280851241629796745672331248892171436291770;
    //  
    // res.registerUser(name, pid, pub_x, pub_y);
    // res.registerUser("Pavle", 2345678912345, 8729176218460562548973127896482079481359769801452716493125971962853443910295, 9328416529780431261879424985573099310275416289943765812297619982154127390826);

    res.saveTreeToFile(merkleTreeFile);
    IncrementalMerkleTree.print(res.tree);
});


