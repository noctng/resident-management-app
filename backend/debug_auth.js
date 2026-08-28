try {
    const authController = require('./src/controllers/authController');
    console.log('Auth Controller Exports:', Object.keys(authController));
    if (authController.authenticate) {
        console.log('authenticate is defined');
    } else {
        console.log('authenticate is UNDEFINED');
    }
} catch (e) {
    console.error('Error loading authController:', e);
}
