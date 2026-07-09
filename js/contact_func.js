/* ===== 1. Date Picker Logic (Auto Update Year) ===== */
document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById('msgDate');
    const today = new Date();
    const currentYear = today.getFullYear();

    // Calculate Today's Date for MAX
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const maxDate = currentYear + '-' + mm + '-' + dd;

    // Calculate Start of Current Year for MIN
    const minDate = currentYear + '-01-01';

    // Apply constraints
    if(dateInput) {
        dateInput.setAttribute("max", maxDate);
        dateInput.setAttribute("min", minDate);
    }
});

/* ===== 2. Sidebar Logic ===== */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function toggleSidebar(event) {
    if(sidebar && overlay) {
        event.stopPropagation();
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

if(overlay) {
    overlay.addEventListener('click', function(){
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

if(sidebar) {
    sidebar.addEventListener('click', function(event){
        event.stopPropagation();
    });
}

document.addEventListener('click', function(){
    if(sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
});

/* ===== 3. Contact Form Logic ===== */

// Character Count & Limit Alert
const messageInput = document.getElementById('userMessage');
const charCountDisplay = document.getElementById('charCount');
const limitAlert = document.getElementById('limitAlert');
const MAX_CHARS = 4000;

if(messageInput) {
    messageInput.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCountDisplay.textContent = currentLength;

        if (currentLength >= MAX_CHARS) {
            charCountDisplay.classList.add('warning');
            limitAlert.style.display = 'inline';
        } else {
            charCountDisplay.classList.remove('warning');
            limitAlert.style.display = 'none';
        }
    });
}

// File Validation (Images Only)
const fileInput = document.getElementById('userImage');
const fileError = document.getElementById('error-file');

if(fileInput) {
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const fileType = file.type;
            if (!fileType.startsWith('image/')) {
                fileError.style.display = 'block';
                this.value = ''; // Clear invalid input
                alert("Error: You can only upload image files.");
            } else {
                fileError.style.display = 'none';
            }
        }
    });
}

// Form Submission
function handleFormSubmit(event) {
    // Get values
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const date = document.getElementById('msgDate').value;
    const message = document.getElementById('userMessage').value.trim();

    // Reset errors
    document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');

    let isValid = true;

    if (name === "") {
        document.getElementById('error-name').style.display = 'block';
        isValid = false;
    }
    if (email === "") {
        document.getElementById('error-email').style.display = 'block';
        isValid = false;
    }
    if (date === "") {
        document.getElementById('error-date').style.display = 'block';
        isValid = false;
    }
    if (message === "") {
        document.getElementById('error-message').style.display = 'block';
        isValid = false;
    }

    if (!isValid) {
        // If validation FAILS, we prevent the form from sending
        event.preventDefault();

        const alertBox = document.getElementById('form-alert');
        if(alertBox) {
            alertBox.className = "alert-box alert-danger";
            alertBox.innerHTML = "<strong>Error:</strong> Please fill in all required fields.";
            alertBox.style.display = 'block';
        }
    }
    // If isValid is TRUE, the browser will submit to PHP automatically.
}