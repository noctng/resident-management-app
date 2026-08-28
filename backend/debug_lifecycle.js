try {
    const controller = require('./src/controllers/contractLifecycleController');
    console.log('Contract Lifecycle Controller Exports:', Object.keys(controller));
    if (controller.addManualEvent) {
        console.log('addManualEvent is defined');
    } else {
        console.log('addManualEvent is UNDEFINED');
    }
} catch (e) {
    console.error('Error loading contractLifecycleController:', e);
}
