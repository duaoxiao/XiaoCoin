const sha256 = require("crypto-js/sha256");
const ecLib = require("elliptic").ec;
const ec = new ecLib("secp256k1"); // curve namen
class Transaction {
  constructor(from, to, amount) {
    this.from = from;
    this.to = to;
    this.amount = amount;
  }

  computeHash() {
    return sha256(`${this.from}${this.to}${this.amount}`).toString();
  }

  sign(privateKey) {
    this.signature = privateKey.sign(this.computeHash(), "base64").toDER("hex");
  }

  isValid() {
    let publicKey;
    if (this.from === null) return true;
    if (!this.signature) throw new Error("sig missing");
    publicKey = ec.keyFromPublic(this.from, "hex");
    return publicKey.verify(this.computeHash(), this.signature);
  }
}

class Block {
  constructor(transactions, previousHash) {
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.timestamp = Date.now();
    this.nonce = 1;
    this.hash = this.computeHash();
  }

  computeHash() {
    return sha256(
      JSON.stringify(this.transactions) +
        this.previousHash +
        this.nonce +
        this.timestamp
    ).toString();
  }

  getAnswer(difficulty) {
    //开头前n位为0的hash
    const answer = "0".repeat(difficulty);
    return answer;
  }

  mine(difficulty) {
    if (!this.validateTransactions()) {
      throw new Error(
        "tampered transactions found, abort, 发现异常交易，停止挖矿"
      );
    }
    while (true) {
      this.hash = this.computeHash();
      if (this.hash.substring(0, difficulty) !== this.getAnswer(difficulty)) {
        this.nonce++;
        this.hash = this.computeHash();
      } else {
        break;
      }
    }
    console.log("挖矿结束", this.hash);
  }

  validateTransactions() {
    for (let transaction of this.transactions) {
      if (!transaction.isValid()) {
        console.log("非法交易");
        return false;
      }
    }
    return true;
  }
}

class Chain {
  constructor(difficulty) {
    this.chain = [this.bigBang()];
    this.transactionPool = [];
    this.minerReward = 50;
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  bigBang() {
    const genesisBlock = new Block("我是祖先", "");
    return genesisBlock;
  }

  getLatestBlock() {
    const latestBlock = this.chain[this.chain.length - 1];
    return latestBlock;
  }
  addTransaction(transaction) {
    if (!transaction.from || !transaction.to)
      throw new Error("invalid from or to");

    if (!transaction.isValid())
      throw new Error("invalid transaction, tampered or invalid sig");

    this.transactionPool.push(transaction);
  }

  mineTransactionPool(minerRewardAddress) {
    const minerRewardTransaction = new Transaction(
      null,
      minerRewardAddress,
      this.minerReward
    );
    this.transactionPool.push(minerRewardTransaction);

    const newBlock = new Block(
      this.transactionPool,
      this.getLatestBlock().hash
    );
    newBlock.mine(this.difficulty);

    this.chain.push(newBlock);
    this.transactionPool = [];
  }

  validateChain() {
    if (this.chain.length === 1) {
      if (this.chain[0].hash !== this.chain[0].computeHash()) {
        return false;
      }
      return true;
    }

    for (let i = 1; i <= this.chain.length - 1; i++) {
      const blockToValidate = this.chain[i];

      if (!blockToValidate.validateTransactions()) {
        return false;
      }

      if (blockToValidate.hash !== blockToValidate.computeHash()) {
        return false;
      }

      const previousBlock = this.chain[i - 1];
      if (blockToValidate.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}
