try {
    const contractController = require('./src/controllers/contractController');
    console.log('Contract Controller Exports:', Object.keys(contractController));
    if (contractController.getAllContracts) {
        console.log('getAllContracts is defined');
    } else {
        console.log('getAllContracts is UNDEFINED');
    }
} catch (e) {
    console.error('Error loading contractController:', e);
}
