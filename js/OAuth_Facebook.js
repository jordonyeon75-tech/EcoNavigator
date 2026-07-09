window.fbAsyncInit = function() {
    FB.init({
        appId      : '2032450344281070',
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
    });
};

function fbLogin() {
    FB.login(function(response) {
        if (response.authResponse) {
            // Get user data after successful login
            FB.api('/me', {fields: 'name, email'}, function(userData) {
                // Send data to your PHP controller
                let formData = new FormData();
                formData.append('fb_name', userData.name);
                formData.append('fb_email', userData.email);

                fetch('../controller/UserController.php?action=facebook_login', {
                    method: 'POST',
                    body: formData
                })
                    .then(res => res.text())
                    .then(data => {
                        // Redirect to dashboard if successful
                        window.location.href = "dashboard.php";
                    });
            });
        }
    }, {scope: 'email'});
}