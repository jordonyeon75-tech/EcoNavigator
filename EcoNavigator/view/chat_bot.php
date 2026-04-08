<div id="eco-chatbot-container">
    <button id="chatbot-launcher" title="Chat with EcoNavigator AI">
        <i class="fa fa-comments"></i>
    </button>

    <div id="chatbot-window" class="chatbot-hidden">
        <div class="chatbot-header">
            <div class="header-title">
                <i class="fa fa-robot"></i> EcoNavigator AI
            </div>
            <div class="header-controls">
                <span id="chatbot-timer" class="timer-warning" style="display:none;">Closing in 60s...</span>
                <button id="chatbot-close"><i class="fa fa-times"></i></button>
            </div>
        </div>

        <div id="chatbot-messages">
        </div>

        <div class="chatbot-input-area">
            <input type="text" id="chatbot-input" placeholder="Type here (e.g., 'Find near G Hotel')..." autocomplete="off">
            <button id="chatbot-send"><i class="fa fa-paper-plane"></i></button>
        </div>
    </div>
</div>