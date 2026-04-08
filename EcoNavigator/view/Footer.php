<footer class="map-footer">
    <div class="footer-left">
        <span>Imagery © <span id="footerYear"></span>, Map data © <span id="footerYear2"></span></span>
        <span class="footer-sep">•</span>
        <span class="brand">EcoNavigator</span>
        <span class="footer-sep">•</span>
        <span id="footerCountry">Malaysia</span>
    </div>

    <div class="footer-right">
        <a href="terms_page.php">Terms</a>
        <a href="privacy_page.php">Privacy</a>
        <a href="#" id="feedbackLink">Send Feedback / Problem</a>
        <span class="footer-distance" id="footerDistance">500 m</span>
    </div>
</footer>

<script>
    // Auto update year
    const year = new Date().getFullYear();
    document.getElementById("footerYear").textContent = year;
    document.getElementById("footerYear2").textContent = year;

    // Placeholder: later you can update dynamically
    // document.getElementById("footerCountry").textContent = "Malaysia";
    // document.getElementById("footerDistance").textContent = "2.4 km";
</script>