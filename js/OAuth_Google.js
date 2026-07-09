window.onload = function () {
    google.accounts.id.initialize({
        client_id: "730344544274-efb71j749f4qn64d37r8aafd2i3mu460.apps.googleusercontent.com",
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: false
    });

    google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        {
            theme: "outline",
            size: "large",
            width: "320", // Matches roughly the width of your inputs
            text: "sign_in_with",
            logo_alignment: "left"
        }
    );

    // Optional: Displays the One Tap prompt automatically
    google.accounts.id.prompt();
};

function handleCredentialResponse(response) {
    // 1. Get the JWT credential from Google
    const responsePayload = decodeJwtResponse(response.credential);

    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email);

    // 2. Send this credential to your PHP Backend (UserController)
    // We create a hidden form and submit it automatically
    const form = document.createElement('form');
    form.method = 'POST';
    // Point this to your existing controller with a new action
    form.action = '../controller/UserController.php?action=google_login';

    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = 'google_credential';
    hiddenField.value = response.credential;

    form.appendChild(hiddenField);
    document.body.appendChild(form);
    form.submit();
}

// Helper function to decode the JWT just for debugging (optional)
function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}