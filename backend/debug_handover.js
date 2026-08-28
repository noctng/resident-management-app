try {
    const controller = require('./src/controllers/handoverController');
    console.log('Handover Controller Exports:', Object.keys(controller));

    const requiredFunctions = [
        'getChecklist',
        'updateChecklistItem',
        'checkHandoverEligibility',
        'completeHandover',
    ];

    requiredFunctions.forEach((fn) => {
        if (controller[fn]) {
            console.log(`✓ ${fn} is defined`);
        } else {
            console.log(`✗ ${fn} is UNDEFINED`);
        }
    });
} catch (e) {
    console.error('Error loading handoverController:', e);
}
