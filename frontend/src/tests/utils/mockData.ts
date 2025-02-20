export const mockProposals = [
    {
        id: 1,
        title: "Adjust Interest Rate Parameters",
        description: "Proposal to modify the interest rate calculation parameters for better market adaptability.",
        votingPower: 100,
        status: 'active',
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 2,
        title: "Update Credit Score Algorithm",
        description: "Proposal to enhance the credit score calculation method.",
        votingPower: 150,
        status: 'active',
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }
];

export const mockWallets = [
    {
        name: 'Petra',
        type: 'petra',
        icon: '/images/petra-wallet.png',
        installed: true
    },
    {
        name: 'Martian',
        type: 'martian',
        icon: '/images/martian-wallet.png',
        installed: true
    },
    {
        name: 'Pontem',
        type: 'pontem',
        icon: '/images/pontem-wallet.png',
        installed: true
    }
];

export const mockAccount = {
    address: '0x123...abc',
    balance: '1000',
    network: 'testnet'
};
