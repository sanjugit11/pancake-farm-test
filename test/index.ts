import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { mineBlocks, expandTo18Decimals } from "./utilities/utilities";
import {
  CakeToken__factory,
  SyrupBar__factory,
  MasterChef__factory,
  TestToken1__factory,
  CakeToken,
  SyrupBar,
  MasterChef,
  TestToken1,

} from "../typechain";

describe("pacakefarm", function () {
  let owner: SignerWithAddress;
  let signers: SignerWithAddress[];
  let MasterChef1: MasterChef;
  let TestToken: TestToken1;
  let CakeToken: CakeToken;
  let SyrupBar: SyrupBar;


  beforeEach(async function () {
    signers = await ethers.getSigners();
    owner = signers[0];                  //this the owner address at array o

    //cakeToken deployment by the owner
    CakeToken = await new CakeToken__factory(owner).deploy();
    console.log(CakeToken.address, "token");

    //syrup bar deployment by the owner
    SyrupBar = await new SyrupBar__factory(owner).deploy(CakeToken.address);
    console.log(SyrupBar.address, "syrup");

    // masterchef deployment by the owner address
    MasterChef1 = await new MasterChef__factory(owner).deploy(CakeToken.address, SyrupBar.address, owner.address, expandTo18Decimals(30), 0);
    console.log(MasterChef1.address, "master chef");

    //testToken deployment by the owner address
    TestToken = await new TestToken1__factory(owner).deploy("love", "LOVE");
    console.log(TestToken.address, "Lp token ");

    console.log(await TestToken.balanceOf(owner.address), "this balance of lP")  //balance of LP LOVE Token by from owner

    //transferownership
    await CakeToken.connect(owner).transferOwnership(MasterChef1.address); //this step is necessary before deposit so LP token use by the masterchef
    console.log(await CakeToken.owner(), "new owner of cake");
    //transferownership
    await SyrupBar.connect(owner).transferOwnership(MasterChef1.address);    //this step is necessary before deposit so LP token use by the masterchef
    console.log(await SyrupBar.owner(), "new owner of syrup");
  });

  //////////////////////__TEST CASES__///////////////////////////////

  //*****/ Here we are adding the Farm pool so an invester can invest the specific LP token for farming//*****/
  it("add the new farm for user", async () => {
    //ADD
    const add1 = await MasterChef1.connect(owner).add(100, owner.address, true);       //add a Farm pool
    // console.log(add1,"...............");                                          
    const PoolLength = await MasterChef1.poolLength();                                 //length of pool will increase
    console.log(PoolLength);
    const totalAllocPoint = await MasterChef1.totalAllocPoint();                       //AllocPonit will increase
    console.log(totalAllocPoint);
    expect(totalAllocPoint).to.equal(133);
    expect(PoolLength).to.equal(2);
  });

  //*****/Here we are depositing the LP token in the pool in the Farm number one//*****/
  it("Deposit of lp token for farming", async () => {
    //ADD
    const add1 = await MasterChef1.connect(owner).add(100, TestToken.address, true);     //add a Farm pool
    console.log(add1.blockNumber, "........add the farm.......");

    const totalAllocPoint = await MasterChef1.totalAllocPoint();
    console.log(totalAllocPoint, "before");
    //APPROVE
    await TestToken.connect(owner).approve(MasterChef1.address, expandTo18Decimals(1000)); //approve the LP token
    console.log(await CakeToken.owner(), "new owner of cake");
    //DEPOSIT            
    await MasterChef1.connect(owner).deposit(1, expandTo18Decimals(100));                  //deposit of LP token to the farm
    const DepositDetail = await MasterChef1.userInfo(1, owner.address);
    console.log(DepositDetail.amount, "this is the user deposit");  
    const allocUserAmount = DepositDetail.amount;                                          //getting amount of token

    expect(Number(allocUserAmount)).to.equal(Number(expandTo18Decimals(100)));

  });

   //*****/set and update the farm pool //*****/
  it("lets update or set the pool detail", async () => {
    //ADD
    await MasterChef1.connect(owner).add(100, TestToken.address, true);                   //add a Farm pool
    //SET OR UPDATE
    await MasterChef1.set(1, 99, true);
    //POOL INFO
    const poolInfo = await MasterChef1.poolInfo(1);
    const poolAllocUpdate = poolInfo.allocPoint;
    console.log(poolAllocUpdate, "new poolupdated allocation");

    expect(Number(poolAllocUpdate)).to.equal(99);
  })

  //*****/withdraw the fund from the pool//*****/
  it("withdraw the funds by the investor", async () => {
    //ADD
    const add1 = await MasterChef1.connect(owner).add(100, TestToken.address, true);
    //BEFORE DEPOSIT lp TOKEN
    const beforeDepositLP = await TestToken.balanceOf(owner.address);
    // APPROVE
    await TestToken.connect(owner).approve(MasterChef1.address, expandTo18Decimals(1000));
    //DEPOSIT
    await MasterChef1.connect(owner).deposit(1, expandTo18Decimals(100));

    const DepositDetail = await MasterChef1.userInfo(1, owner.address);                        //getting user info
    const allocUserAmount = DepositDetail.amount;                                        
    //WITHDRAW
    await MasterChef1.withdraw(1, allocUserAmount);
  
    const afterWithdrawlLP = await TestToken.balanceOf(owner.address);                        //after deposit of lp token by owner

    expect(Number(beforeDepositLP)).to.equal(Number(afterWithdrawlLP));
  });

  //*****/CAKE TOKEN EARN AS REWARD //*****/
  it.only("Cake token earn by the investor check", async () => {
    //ADD
    const add = await MasterChef1.connect(owner).add(100, TestToken.address, true);
 
    console.log(await TestToken.balanceOf(owner.address), "before LP token ")                //bALANCE OF TestToken BEFORE
    //APPROVE
    await TestToken.connect(owner).approve(MasterChef1.address, expandTo18Decimals(1000));
   
    const bal1 = await CakeToken.connect(owner).balanceOf(owner.address);                    //bALANCE OF CakeToken
    console.log(bal1, "Balance 1");
    //DEPOSIT
     await MasterChef1.connect(owner).deposit(1, expandTo18Decimals(100));

    // adding the farm so that extra block can be mined & if blocked mined then cake token willbe mined with block
    const add1 = await MasterChef1.connect(owner).add(100, TestToken.address, true);                                                                                                  
    console.log(add1.blockNumber, "........block number.......");                           //block number mined

    const add2 = await MasterChef1.connect(owner).add(100, TestToken.address, true);
    console.log(add2.blockNumber, "........block number.......");                           //block number mined

    const freeCake = await MasterChef1.pendingCake(1, owner.address);                       //cake Reward for the pool iD 1
    console.log(freeCake, "this is the cake minted for the investor");
    //DEPOSIT
    // await MasterChef1.connect(owner).deposit(1, expandTo18Decimals(200));                   
    // // await mineBlocks(ethers.provider, 120);

    // const freeCake2 = await MasterChef1.pendingCake(1, owner.address);
    // console.log(freeCake2, "this is the cake minted for the investor");

    // const DepositDetail = await MasterChef1.userInfo(1, owner.address);
    // console.log(DepositDetail, "this is the user deposit");

    const bal2 = await CakeToken.connect(owner).balanceOf(owner.address);                  //bALANCE OF CakeToken after mined
    console.log(bal2, "Balance 2");
    expect(Number(bal1)).to.lessThan(Number(bal2));
  });

   //*****/emergency withdrawl//*****/
  it("emergency withdrawl check", async () => {
    //ADD
    const add = await MasterChef1.connect(owner).add(100, TestToken.address, true);
   
    console.log(await TestToken.balanceOf(owner.address), "before LP token ")             //bALANCE OF TestToken
    //APPROVE
    await TestToken.connect(owner).approve(MasterChef1.address, expandTo18Decimals(1000));

    const bal1 = await CakeToken.connect(owner).balanceOf(owner.address);                //balance of caketoken for owner before
    console.log(bal1, "Balance 1");
    //DEPOSIT
    await MasterChef1.connect(owner).deposit(1, expandTo18Decimals(100));
    
    const pendingLP = await TestToken.balanceOf(owner.address);                          //bALANCE OF TestToken AFTER DEPOSIT
    console.log(pendingLP, "after deposit");

    await MasterChef1.emergencyWithdraw(1);
    const pendingLP1 = await TestToken.balanceOf(owner.address);                         //balance of caketoken for owner before
    console.log(pendingLP1, "after deposit");
    expect(Number(bal1)).to.lessThan(Number(pendingLP1));
  });

   //*****/revert case//*****/
  it("Reverted due to less approval for deposit", async () => {
    //ADD
    const add = await MasterChef1.connect(owner).add(100, TestToken.address, true);
    //APPROVE
    await TestToken.connect(owner).approve(MasterChef1.address, expandTo18Decimals(10));
    //REVERT CASE FOR DEPOSIT
    await expect(MasterChef1.connect(owner).deposit(1, expandTo18Decimals(100))).revertedWith('ERC20: transfer amount exceeds allowance');
    
  });



});







  // it("this is the basic deployment", async ()=>{
  //   const token = await new CakeToken__factory(owner).deploy();
  //   console.log(token.address,"token");
  //   const syrup = await new SyrupBar__factory(owner).deploy(token.address);
  //   console.log(syrup.address,"syrup");

  //   const farm = await new MasterChef__factory(owner).deploy(token.address,syrup.address,owner.address,expandTo18Decimals(30),15336119);
  //   console.log(farm.address, "master chef");

  //   const tokenLP = await new TestToken1__factory(owner).deploy("love","LOVE");
  //   console.log(tokenLP.address,"Lp token ");
  //   console.log(await tokenLP.balanceOf(owner.address));
  // })