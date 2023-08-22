import "./App.css";
import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Container,
  Row,
  Col,
  Form,
  Stack,
  Modal,
  ListGroup,
  Image,
} from "react-bootstrap";
import { Toaster } from "react-hot-toast";
import { toast } from "react-hot-toast";
import { BrowserProvider, ethers, InfuraProvider } from "ethers";
import { Spinner } from "react-bootstrap";
import { CaretDownFill, ArrowDownUp } from "react-bootstrap-icons";

function App() {
  const uniswapRouterContract = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const routerAbi = require("./abis/router.json");
  const erc20Abi = require("./abis/erc20.json");
  const availableTokensList = [
    {
      name: "Ethereum",
      symbol: "ETH",
      img: "https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/256/Ethereum-ETH-icon.png",
      contract: "",
      abi: "",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      img: "https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png",
      contract: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      abi: require("./abis/uniAbi.json"),
    },
    {
      name: "Wrapped Ether",
      symbol: "WETH",
      img: "https://www.block-chain24.com/sites/default/files/crypto/weth_weth_coin_icon_256x256.svg",
      contract: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      abi: require("./abis/wethAbi.json"),
    },
  ];
  const [show, setShow] = useState(false);
  const [availableTokens, setAvailableTokens] = useState(availableTokensList);
  const [isDisabledSwap, setIsDisabledSwap] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [showSearhLoader, setShowSearhLoader] = useState(false);
  const [swapLoader, setSwapLoader] = useState(false);
  const [getModal, setModal] = useState();
  const [customCode, setCustomCode] = useState();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState();
  const [balanceOne, setBalanceOne] = useState(0);
  const [fromAmount, setFromAmount] = useState(0);
  const [toAmount, setToAmount] = useState(0);
  const [balanceTwo, setBalanceTwo] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [txHash, setTxHash] = useState(null);
  const [selectedOne, setSelectedOne] = useState(null);
  const [selectedTwo, setSelectedTwo] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [uniswapRouterInstance, setUniswapRouterInstance] = useState(null);

  useEffect(() => {
    handleConnection();
    window.ethereum.on("chainChanged", (cid) => {
      if (cid !== "0x5") {
        alert("Invalid network selected. Please switch to goerli");
        handleConnection();
      }
    });
    window.ethereum.on("accountsChanged", (account) => {
      if (account.length == 0) {
        setIsConnected(false);
        setAddress();
      } else {
        setAddress(account[0]);
      }
    });

  }, []);

  useEffect(() => {
    getSetBalances();
  }, [selectedOne, selectedTwo]);

  useEffect(() => {
    function fetchOutComes() {
      if (
        (selectedOne.symbol == "ETH" && selectedTwo.symbol == "WETH") ||
        (selectedOne.symbol == "WETH" && selectedTwo.symbol == "ETH")
      ) {
        if (fromAmount <= balanceOne) {
          setToAmount(fromAmount);
          setShowLoader(false);
          setAllowance(fromAmount);
          setIsDisabledSwap(false);
        } else {
          setToAmount(fromAmount);
          setShowLoader(false);
          setAllowance(fromAmount);
          setIsDisabledSwap(true);
        }
      } else {
        const tokenContractOne = new ethers.Contract(
          selectedOne.symbol == "ETH"
            ? availableTokens[2].contract
            : selectedOne.contract,
          selectedOne.symbol == "ETH"
            ? availableTokens[2].abi
            : selectedOne.abi,
          provider
        );
        uniswapRouterInstance
          .getAmountsOut(ethers.parseEther(fromAmount.toString()), [
            selectedOne.symbol == "ETH"
              ? availableTokens[2].contract
              : selectedOne.contract,
            selectedTwo.symbol == "ETH"
              ? availableTokens[2].contract
              : selectedTwo.contract,
          ])
          .then((data) => {
            setToAmount(Number(ethers.formatEther(data[1])));
            setShowLoader(false);
            if (fromAmount <= balanceOne) {
              fetchAllowance(tokenContractOne);
              setIsDisabledSwap(false);
            } else {
              setIsDisabledSwap(true);
            }
          })
          .catch((err) => {
            console.log(err);
            toast.error("Please check the console for error logs");
          });
      }
    }
    if (
      uniswapRouterInstance !== null &&
      fromAmount > 0 &&
      selectedOne !== null &&
      selectedTwo !== null
    ) {
      fetchOutComes();
    }
  }, [fromAmount, toAmount, selectedTwo, selectedOne]);

  const trackSwaps = (tx) => {
    setTxHash(tx);
    setTxStatus(3);
    setSwapLoader(true);
    var interval = setInterval(() => {
      provider
        .getTransactionReceipt(tx)
        .then((resp) => {
          if (resp) {
            setSwapLoader(false);
            setTxStatus(resp.status);
            setTimeout(() => {
              getSetBalances();
              setTxStatus(null);
              setFromAmount(0);
              setToAmount(0);
            }, 3000);
            clearInterval(interval);
          }
        })
        .catch((err) => {
          console.log(err);
          toast.error("Please check the console for error logs");
          clearInterval(interval);
        });
    }, 2000);
  };

  const trackApprovals = (tx, tc) => {
    setTxStatus(3);
    setSwapLoader(true);
    var interval = setInterval(() => {
      provider
        .getTransactionReceipt(tx)
        .then((resp) => {
          if (resp !== null) {
            if (resp.status == 1) {
              setSwapLoader(false);
              setTimeout(() => {
                setAllowance(fromAmount);
                setTxStatus(null);
                toast.success("Approved! You can swap now.");
              }, 2000);
              clearInterval(interval);
            } else {
            }
          }
        })
        .catch((err) => {
          console.log(err);
          toast.error("Please check the console for error logs");
          clearInterval(interval);
        });
    }, 2000);
  };

  const handleClose = () => setShow(false);

  const handleShow = (e) => {
    setModal(e);
    setShow(true);
  };

  const handleConnection = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      alert("Please install metamask to use this app!");
    } else {
      const browserProvider = new BrowserProvider(window.ethereum);
      browserProvider
        .getSigner()
        .then((resp) => {
          setSigner(resp);
          const routerContract = new ethers.Contract(
            uniswapRouterContract,
            routerAbi,
            resp
          );
          setUniswapRouterInstance(routerContract);
          window.ethereum
            .request({
              method: "eth_chainId",
              params: [],
            })
            .then((resp) => {
              if (resp !== "0x5") {
                window.ethereum
                  .request({
                    method: "wallet_switchEthereumChain",
                    params: [
                      {
                        chainId: "0x5",
                      },
                    ],
                  })
                  .then((re) => {
                    if (re == null) {
                      fetchAccount();
                    } else {
                      alert("Unable to connect to metamask!");
                    }
                  })
                  .catch((er) => {
                    if (er.code == 4001) {
                      setIsConnected(false);
                      toast.error("You rejected this transaction");
                    } else {
                      toast.error("Please check console for error logs");
                      console.log(er);
                    }
                  });
              } else {
                fetchAccount();
              }
            })
            .catch((err) => {
              console.log(err);
              toast.error("Please check console for error logs");
            });
        })
        .catch((err) => {
          if (err.code == 4001 || err.reason == "rejected") {
            toast.error("You rejected metamask connection!");
          } else if (err.error.code !== -32002) {
            toast.error("Please check console for error logs");
            console.log(err);
          } else {
            console.log(err);
          }
        });
      const infuraProvider = new InfuraProvider(
        "goerli",
        process.env.REACT_APP_KEY
      );
      setProvider(infuraProvider);
    }
  };

  function fetchAccount() {
    window.ethereum
      .request({
        method: "eth_requestAccounts",
        params: [],
      })
      .then((resp) => {
        if (resp.length == 0) {
          handleConnection();
        } else {
          setAddress(resp[0]);
          setIsConnected(true);
        }
      })
      .catch((errr) => {
        if (errr.code == 4001) {
          toast.error("You rejected this transaction");
        } else {
          toast.error("Please check console for error logs");
          console.log(errr);
        }
      });
  }

  const fetchAllowance = (tokenContractOne) => {
    if (selectedOne.symbol == "ETH") {
      setAllowance(fromAmount);
    } else {
      tokenContractOne
        .allowance(address, uniswapRouterContract)
        .then((resp) => {
          setAllowance(ethers.formatEther(resp));
          return true;
        })
        .catch((err) => {
          console.log(err);
          return false;
        });
    }
  };

  const getSetBalances = () => {
    if (selectedOne !== null && selectedOne.symbol == "ETH") {
      provider.getBalance(address).then((c) => {
        const balance = Number(ethers.formatEther(c)).toFixed(3);
        setBalanceOne(Number(balance));
      });
    }
    if (selectedTwo !== null && selectedTwo.symbol == "ETH") {
      provider.getBalance(address).then((c) => {
        const balance = Number(ethers.formatEther(c)).toFixed(3);
        setBalanceTwo(Number(balance));
      });
    }

    if (selectedOne !== null && selectedOne.symbol !== "ETH") {
      const tokenContractOne = new ethers.Contract(
        selectedOne.contract,
        selectedOne.abi,
        provider
      );
      tokenContractOne
        .balanceOf(address)
        .then((resp) => {
          setBalanceOne(Number(ethers.formatEther(resp)).toFixed(3));
        })
        .catch((err) => {
          console.log(err);
          toast.error(
            "Error fetching balance. Please check the console for error logs"
          );
        });
    }
    if (selectedTwo !== null && selectedTwo.symbol !== "ETH") {
      const tokenContractTwo = new ethers.Contract(
        selectedTwo.contract,
        selectedTwo.abi,
        provider
      );
      tokenContractTwo
        .balanceOf(address)
        .then((respp) => {
          setBalanceTwo(Number(ethers.formatEther(respp)).toFixed(3));
        })
        .catch((errr) => {
          console.log(errr);
          toast.error(
            "Error fetching balance. Please check the console for error logs"
          );
        });
    }
  };

  const swapHandler = async () => {
    setSwapLoader(true);
    if (selectedOne.symbol == selectedTwo.symbol) {
      alert("Cannot swap same tokens");
      setSwapLoader(false);
    } else if (selectedOne.symbol == "ETH" && selectedTwo.symbol == "WETH") {
      const tokenContractTwo = new ethers.Contract(
        selectedTwo.contract,
        selectedTwo.abi,
        signer
      );
      tokenContractTwo
        .deposit({ value: ethers.parseEther(fromAmount.toString()) })
        .then((resp) => {
          trackSwaps(resp.hash);
          setSwapLoader(false);
        })
        .catch((err) => {
          if (err.reason == "rejected") {
            toast.error("You rejected this transaction");
          } else {
            toast.error("Please check console for error logs");
            console.log(err);
          }
          setSwapLoader(false);
        });
    } else if (selectedOne.symbol == "WETH" && selectedTwo.symbol == "ETH") {
      const tokenContractOne = new ethers.Contract(
        selectedOne.contract,
        selectedOne.abi,
        signer
      );
      const ethAmount = // eslint-disable-next-line no-undef
        BigInt(ethers.parseEther(fromAmount.toString()));
      tokenContractOne
        .withdraw(ethAmount)
        .then((resp) => {
          trackSwaps(resp.hash);
          setSwapLoader(false);
        })
        .catch((err) => {
          if (err.reason == "rejected") {
            toast.error("You rejected this transaction");
          } else {
            toast.error("Please check console for error logs");
            console.log(err);
          }
          setSwapLoader(false);
        });
    } else if (selectedOne.symbol == "ETH" && selectedTwo.symbol !== "WETH") {
      uniswapRouterInstance
        .swapExactETHForTokens(
          // eslint-disable-next-line no-undef
          BigInt(ethers.parseEther(toAmount.toString())),
          ["0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", selectedTwo.contract],
          address,
          Date.now() + 1000 * 60 * 10,
          { value: ethers.parseEther(fromAmount.toString()) }
        )
        .then((resp) => {
          trackSwaps(resp.hash);
          setSwapLoader(false);
        })
        .catch((err) => {
          if (err.reason == "rejected") {
            toast.error("You rejected this transaction");
          } else {
            toast.error("Please check console for error logs");
            console.log(err);
          }
          setSwapLoader(false);
        });
    } else if (selectedTwo.symbol == "ETH" && selectedOne.symbol !== "WETH") {
      if (Number(allowance) < Number(fromAmount)) {
        const tokenContractOne = new ethers.Contract(
          selectedOne.contract,
          selectedOne.abi,
          signer
        );
        tokenContractOne
          .approve(
            uniswapRouterContract,
            // eslint-disable-next-line no-undef
            BigInt(ethers.parseEther(fromAmount.toString()))
          )
          .then((resp) => {
            trackApprovals(resp.hash, tokenContractOne);
            fetchAllowance(tokenContractOne);
          })
          .catch((err) => {
            if (err.reason == "rejected") {
              toast.error("You rejected this transaction");
            } else {
              toast.error("Please check console for error logs");
              console.log(err);
            }
            setSwapLoader(false);
          });
      } else {
        uniswapRouterInstance
          .swapExactTokensForETH(
            // eslint-disable-next-line no-undef
            BigInt(ethers.parseEther(fromAmount.toString())),
            // eslint-disable-next-line no-undef
            BigInt(ethers.parseEther(toAmount.toString())),
            [
              selectedOne.contract,
              "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
            ],
            address,
            Date.now() + 1000 * 60 * 10
          )
          .then((resp) => {
            trackSwaps(resp.hash);
            setSwapLoader(false);
          })
          .catch((err) => {
            if (err.reason == "rejected") {
              toast.error("You rejected this transaction");
            } else {
              toast.error("Please check console for error logs");
              console.log(err);
            }
            setSwapLoader(false);
          });
      }
    } else {
      const tokenContractOne = new ethers.Contract(
        selectedOne.contract,
        selectedOne.abi,
        signer
      );
      if (Number(allowance) < Number(fromAmount)) {
        tokenContractOne
          .approve(
            uniswapRouterContract,
            // eslint-disable-next-line no-undef
            BigInt(ethers.parseEther(fromAmount.toString()))
          )
          .then((resp) => {
            trackApprovals(resp.hash, tokenContractOne);
            setSwapLoader(false);
            fetchAllowance(tokenContractOne);
          })
          .catch((err) => {
            if (err.reason == "rejected") {
              toast.error("You rejected this transaction");
            } else {
              toast.error("Please check console for error logs");
              console.log(err);
            }
            setSwapLoader(false);
          });
      } else {
        uniswapRouterInstance
          .swapExactTokensForTokens(
            // eslint-disable-next-line no-undef
            BigInt(ethers.parseEther(fromAmount.toString())),
            // eslint-disable-next-line no-undef
            BigInt(ethers.parseEther(toAmount.toString())),
            [selectedOne.contract, selectedTwo.contract],
            address,
            Date.now()
          )
          .then((resp) => {
            trackSwaps(resp.hash);
            setSwapLoader(false);
          })
          .catch((err) => {
            if (err.reason == "rejected") {
              toast.error("You rejected this transaction");
            } else {
              toast.error("Please check console for error logs");
              console.log(err);
            }
            setSwapLoader(false);
          });
      }
    }
  };

  return (
    <div className="App">
      <Container
        fluid
        style={{ position: "absolute", paddingRight: 50 }}
        className="d-flex align-items-end flex-column mt-3"
      >
        <Stack
          direction="horizontal"
          gap={3}
          style={{ justifyContent: "flex-end" }}
        >
          <Button
            disabled
            variant="dark"
            style={{
              display: isConnected == true ? "flex" : "none",
              color: "white",
              fontWeight: "bolder",
              textOverflow: "ellipsis",
            }}
          >
            {address}
          </Button>
          <Button
            onClick={() => {
              if (isConnected == false) {
                handleConnection();
              }
            }}
          >
            {isConnected == true ? "Connected" : "Connect"}
          </Button>
        </Stack>
      </Container>
      <Toaster position="bottom-center" />
      <header className="App-header">
        <Card bg="dark" style={{ width: "65vh", maxHeight: "90vh" }}>
          <Card.Body>
            <Stack gap={4}>
              <Card.Title
                style={{ color: "white", fontSize: 40, margin: 0, padding: 0 }}
              >
                Zswap
              </Card.Title>
              <Container
                className="d-flex align-items-center"
                style={{
                  backgroundColor: "#282c34",
                  height: "100px",
                  width: "100%",
                  borderRadius: 10,
                }}
              >
                <Row>
                  <Col md={8} lg={8} sm={8} xl={8} xxl={8}>
                    <Form.Control
                      className="text-secondary"
                      id="from"
                      type="number"
                      style={{
                        backgroundColor: "#282c34",
                        borderColor: "#282c34",
                        color: "white",
                        fontSize: 30,
                      }}
                      onChange={(e) => {
                        if (
                          Number(e.target.value) == 0 ||
                          selectedTwo == null
                        ) {
                          setShowLoader(false);
                          setFromAmount(Number(0));
                        }
                        setShowLoader(true);
                        setFromAmount(Number(e.target.value));
                      }}
                      placeholder={0}
                      value={fromAmount}
                    />
                  </Col>
                  <Col>
                    <Stack gap={1} style={{ alignItems: "center" }}>
                      <Button
                        style={{ width: "100px", maxWidth: "100px" }}
                        onClick={() => {
                          handleShow(0);
                        }}
                      >
                        <b>
                          {selectedOne == null ? "Select" : selectedOne.symbol}{" "}
                        </b>
                        <CaretDownFill />
                      </Button>
                      <text
                        className="text-secondary"
                        style={{
                          fontSize: 15,
                          display: isConnected == true ? "block" : "none",
                        }}
                      >
                        Balance{" "}
                        <span style={{ color: "white" }}>{balanceOne}</span>
                      </text>
                    </Stack>
                  </Col>
                </Row>
              </Container>
              <Container>
                <Button
                  style={{ display: showLoader == true ? "none" : "" }}
                  onClick={() => {
                    setSelectedOne(selectedTwo);
                    setSelectedTwo(selectedOne);
                    setFromAmount(0);
                    setToAmount(0);
                  }}
                >
                  <ArrowDownUp
                    style={{ display: showLoader == true ? "none" : "" }}
                    fill="white"
                    height={18}
                    width={18}
                  />
                </Button>
                <Spinner hidden={!showLoader} variant="secondary" />
              </Container>
              <Container
                className="d-flex align-items-center"
                style={{
                  backgroundColor: "#282c34",
                  height: "100px",
                  width: "100%",
                  borderRadius: 10,
                }}
              >
                <Row>
                  <Col md={8} lg={8} sm={8} xl={8} xxl={8}>
                    <Form.Control
                      className="text-secondary"
                      disabled
                      id="to"
                      type="number"
                      style={{
                        backgroundColor: "#282c34",
                        borderColor: "#282c34",
                        color: "white",
                        fontSize: 30,
                      }}
                      onChange={(e) => {
                        setToAmount(Number(e.target.value));
                      }}
                      value={toAmount}
                    />
                  </Col>
                  <Col>
                    <Stack gap={1} style={{ alignItems: "center" }}>
                      <Button
                        style={{ width: "100px", maxWidth: "100px" }}
                        onClick={() => {
                          handleShow(1);
                        }}
                      >
                        <b>
                          {selectedTwo == null ? "Select" : selectedTwo.symbol}{" "}
                        </b>
                        <CaretDownFill />
                      </Button>
                      <text
                        className="text-secondary"
                        style={{
                          fontSize: 15,
                          display: isConnected == true ? "block" : "none",
                        }}
                      >
                        Balance{" "}
                        <span style={{ color: "white" }}>{balanceTwo}</span>
                      </text>
                    </Stack>
                  </Col>
                </Row>
              </Container>
            </Stack>
            <Button
              size="lg"
              disabled={
                txStatus == 0 || txStatus == 1 || txStatus == 3
                  ? true
                  : isConnected == false
                  ? false
                  : isDisabledSwap
              }
              variant={
                txStatus == 0
                  ? "danger"
                  : txStatus == 1
                  ? "success"
                  : txStatus == 3
                  ? "warning"
                  : "primary"
              }
              style={{ width: "100%", fontWeight: "bolder", marginTop: 25 }}
              onClick={() => {
                if (isConnected == true) {
                  swapHandler();
                } else {
                  handleConnection();
                }
              }}
            >
              <Spinner hidden={!swapLoader} variant="white" size="sm" />{" "}
              {(isConnected == true &&
                selectedOne == null &&
                selectedTwo == null) ||
                ((selectedOne == null || selectedTwo == null) &&
                  txStatus == null &&
                  isConnected == true &&
                  "Please select token's")}
              {isConnected == true &&
                selectedOne &&
                fromAmount > balanceOne &&
                txStatus == null &&
                "Insufficient balance"}
              {isConnected == true &&
                Number(allowance) >= Number(fromAmount) &&
                fromAmount <= balanceOne &&
                txStatus == null &&
                "Swap"}
              {isConnected == true &&
                Number(allowance) < Number(fromAmount) &&
                fromAmount <= balanceOne &&
                selectedTwo !== null &&
                txStatus == null &&
                "Approve"}
              {isConnected == false && txStatus == null && "Connect"}
              {txStatus == 0
                ? "Failed"
                : txStatus == 1
                ? "Successful"
                : txStatus == 3
                ? "Pending"
                : ""}
            </Button>
            {txStatus && (
              <Button
                variant="link"
                style={{ textDecoration: "none" }}
                href={`https://goerli.etherscan.io/tx/${txHash}`}
                target="_blank"
              >
                View Transaction
              </Button>
            )}
          </Card.Body>
        </Card>

        <Modal show={show} onHide={handleClose} className="special_modal">
          <Modal.Header closeButton style={{ borderBottomWidth: 0 }}>
            <Modal.Title>Select a token</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: "500px" }}>
            <Stack gap={3}>
              <Form.Control
                id="customToken"
                className="text-secondary"
                style={{
                  backgroundColor: "#282c34",
                  borderColor: "#282c34",
                  color: "white",
                  fontSize: 20,
                }}
                onChange={async (e) => {
                  setCustomCode();
                  setShowSearhLoader(true);
                  try {
                    const address = e.target.value;
                    const contractInstance = new ethers.Contract(
                      address,
                      erc20Abi,
                      provider
                    );
                    const symbol = await contractInstance.symbol();
                    const name = await contractInstance.name();
                    setShowSearhLoader(false);
                    const h = availableTokens.findIndex((i) => {
                      return i.contract == e.target.value;
                    });
                    if (h == -1) {
                      setAvailableTokens((prev) => [
                        {
                          name: name,
                          symbol: symbol,
                          img: "https://i0.wp.com/mikeyarce.com/wp-content/uploads/2021/09/woocommerce-placeholder.png?ssl=1",
                          contract: address,
                          abi: erc20Abi,
                          isCustom: true,
                        },
                        ...prev,
                      ]);
                    }
                  } catch (err) {
                    console.log(err);
                    setShowSearhLoader(false);
                    setCustomCode("Invalid token address");
                  }
                }}
                placeholder={"Paste token address"}
              />
              <Container className="d-flex justify-content-center">
                <ListGroup
                  style={{ width: "100%", backgroundColor: "#282c34" }}
                >
                  <ListGroup.Item
                    style={{
                      backgroundColor: "#282c34",
                      borderColor: "#282c34",
                      color: "white",
                      fontWeight: "bold",
                      alignItems: "center",
                      alignSelf: "center",
                    }}
                  >
                    <Spinner hidden={!showSearhLoader} variant="secondary" />
                    {customCode}
                  </ListGroup.Item>
                  {availableTokens.map((token, index) => {
                    return (
                      <ListGroup.Item
                        key={index}
                        disabled={
                          token.symbol == selectedOne?.symbol ||
                          token.symbol == selectedTwo?.symbol
                            ? true
                            : false
                        }
                        action
                        onClick={() => {
                          if (getModal == 0) {
                            setSelectedOne(token);
                            handleClose();
                          } else {
                            setSelectedTwo(token);
                            handleClose();
                          }
                        }}
                        style={{
                          backgroundColor: "#282c34",
                          borderColor: "#282c34",
                          opacity:
                            token.symbol == selectedOne?.symbol ||
                            token.symbol == selectedTwo?.symbol
                              ? 0.5
                              : 1,
                        }}
                      >
                        <Stack direction="horizontal" gap={2}>
                          <Image
                            style={{}}
                            src={token.img}
                            height={"35px"}
                            alt="CY"
                          />
                          <Stack>
                            <text
                              className={""}
                              style={{ color: "white", fontWeight: "bold" }}
                            >
                              {token.name}
                            </text>
                            <text
                              className="text-secondary"
                              style={{ fontSize: 15 }}
                            >
                              {token.symbol}
                            </text>
                          </Stack>
                        </Stack>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </Container>
            </Stack>
          </Modal.Body>
        </Modal>
      </header>
    </div>
  );
}

export default App;
