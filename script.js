// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

  // --- State Variables ---
  let isRunning = false;
  let readyToStart = false;
  let isPaused = false;
  let isExtraTime = false;
  
  let mainTimeRemaining = 0;
  let extraTimeRemaining = 0;
  
  let calculatedTimes = { start: '', end: '', extraEnd: '' };
  let targetStartHour = 0;
  let targetStartMin = 0;

  let intervalRef = null;
  let checkTimeIntervalRef = null;

  // --- DOM Element References ---
  const el = {
    // Inputs
    startingTimeInput: document.getElementById('starting-time'),
    examDurationInput: document.getElementById('exam-duration'),
    extraTimeInput: document.getElementById('extra-time'),

    // Buttons
    btnReadyStart: document.getElementById('btn-ready-start'),
    btnPause: document.getElementById('btn-pause'),
    btnPauseText: document.getElementById('btn-pause-text'),
    iconPause: document.getElementById('icon-pause'),
    iconPlay: document.getElementById('icon-play'),
    btnReset: document.getElementById('btn-reset'),
    btnResetText: document.getElementById('btn-reset-text'),

    // Display Areas
    setupMessage: document.getElementById('setup-message'),
    readyState: document.getElementById('ready-state'),
    runningState: document.getElementById('running-state'),
    inputArea: document.getElementById('input-area'),
    previewArea: document.getElementById('preview-area'),

    // Ready State Displays
    readyStartTime: document.getElementById('ready-start-time'),
    readyCurrentTime: document.getElementById('ready-current-time'),

    // Running State Displays
    currentTimeDisplay: document.getElementById('current-time-display'),
    startTimeDisplay: document.getElementById('start-time-display'),
    endTimeDisplay: document.getElementById('end-time-display'),
    extraEndTimeDisplay: document.getElementById('extra-end-time-display'),
    
    mainTimerLabel: document.getElementById('main-timer-label'),
    mainTimeDisplay: document.getElementById('main-time-display'),
    mainTimeCompleteMsg: document.getElementById('main-time-complete-msg'),
    
    extraTimerBlock: document.getElementById('extra-timer-block'),
    extraTimerLabel: document.getElementById('extra-timer-label'),
    extraTimeDisplay: document.getElementById('extra-time-display'),
    extraTimeCompleteMsg: document.getElementById('extra-time-complete-msg'),

    // Preview Displays
    previewStart: document.getElementById('preview-start'),
    previewDuration: document.getElementById('preview-duration'),
    previewExtra: document.getElementById('preview-extra'),
    
    // Status Indicator
    statusIndicator: document.getElementById('status-indicator'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
  };

  // --- Helper Functions ---

  /**
   * Formats total seconds into HH:MM:SS string
   */
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * Gets exam duration in seconds from input
   */
  const calculateExamTime = () => {
    const duration = parseInt(el.examDurationInput.value) || 0;
    return duration * 60;
  };

  /**
   * Gets extra time in seconds from input
   */
  const calculateExtraTimeSeconds = () => {
    const extra = parseInt(el.extraTimeInput.value) || 0;
    return extra * 60;
  };

  /**
   * Updates the color of the main timer based on remaining time
   */
  const updateMainTimeColor = () => {
    const totalTime = calculateExamTime();
    if (totalTime === 0) {
      el.mainTimeDisplay.className = 'main-time-text text-green'; // Default
      return;
    }
    
    const percentage = (mainTimeRemaining / totalTime) * 100;
    let colorClass = 'text-red';
    if (percentage > 50) colorClass = 'text-green';
    else if (percentage > 20) colorClass = 'text-amber';
    
    el.mainTimeDisplay.className = `main-time-text ${colorClass}`;
  };

  /**
   * Updates the preview boxes based on input values
   */
  const updatePreviews = () => {
    el.previewStart.textContent = el.startingTimeInput.value;
    el.previewDuration.textContent = formatTime(calculateExamTime());
    el.previewExtra.textContent = formatTime(calculateExtraTimeSeconds());
  };

  /**
   * Updates the "Current Time" displays
   */
  const updateCurrentTimeDisplay = () => {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    if (readyToStart) {
      el.readyCurrentTime.textContent = `Current Time: ${timeString}`;
    }
    if (isRunning) {
      el.currentTimeDisplay.textContent = timeString;
    }
  };

  /**
   * Central function to update the entire UI based on state variables
   */
  const updateUI = () => {
    // Toggle main display blocks
    el.setupMessage.classList.toggle('hidden', readyToStart || isRunning);
    el.readyState.classList.toggle('hidden', !readyToStart);
    el.runningState.classList.toggle('hidden', !isRunning);
    
    // Toggle control panel blocks
    el.inputArea.classList.toggle('hidden', readyToStart || isRunning);
    el.previewArea.classList.toggle('hidden', readyToStart || isRunning);

    // Toggle buttons
    el.btnReadyStart.classList.toggle('hidden', readyToStart || isRunning);
    el.btnPause.classList.toggle('hidden', !isRunning);
    el.btnReset.classList.toggle('hidden', !readyToStart && !isRunning);

    // Update Reset button text
    el.btnResetText.textContent = readyToStart ? 'Cancel' : 'Reset';

    // Update Pause button
    el.btnPauseText.textContent = isPaused ? 'Resume' : 'Pause';
    el.iconPause.classList.toggle('hidden', isPaused);
    el.iconPlay.classList.toggle('hidden', !isPaused);

    // Update status indicator
    el.statusIndicator.classList.toggle('hidden', !isRunning);
    if (isRunning) {
      el.statusText.textContent = isPaused ? 'Timer Paused' : 'Timer Running';
      el.statusDot.classList.toggle('paused', isPaused);
    }
    
    // Update "Extra Time" block style
    el.extraTimerBlock.classList.toggle('is-extra-time', isExtraTime);
    
    // Update timer labels
    el.mainTimerLabel.textContent = isExtraTime ? 'Main Exam Time' : 'Exam Time Remaining';
    el.extraTimerLabel.textContent = isExtraTime ? 'Extra Time Remaining' : 'Extra Time Available';
    
    // Update "Time Complete" messages
    el.mainTimeCompleteMsg.classList.toggle('hidden', !isExtraTime || mainTimeRemaining > 0);
    el.extraTimeCompleteMsg.classList.toggle('hidden', extraTimeRemaining > 0 || !isExtraTime);
  };

  // --- Core Timer Logic ---

  /**
   * The main "tick" function called every second by the timer
   */
  const tick = () => {
    if (isPaused) return;

    updateCurrentTimeDisplay();

    if (!isExtraTime && mainTimeRemaining > 0) {
      // Main exam timer
      mainTimeRemaining--;
      if (mainTimeRemaining <= 0) {
        mainTimeRemaining = 0;
        isExtraTime = true;
        // Play a sound or flash screen here if desired
        updateUI();
      }
    } else if (isExtraTime && extraTimeRemaining > 0) {
      // Extra time timer
      extraTimeRemaining--;
      if (extraTimeRemaining <= 0) {
        extraTimeRemaining = 0;
        isRunning = false;
        clearInterval(intervalRef);
        intervalRef = null;
        // Play a final sound
        updateUI();
      }
    } else {
      // Should not happen, but safeguard
      isRunning = false;
      clearInterval(intervalRef);
      intervalRef = null;
      updateUI();
    }
    
    // Update time displays
    el.mainTimeDisplay.textContent = formatTime(mainTimeRemaining);
    el.extraTimeDisplay.textContent = formatTime(extraTimeRemaining);
    updateMainTimeColor();
  };

  /**
   * Checks if the current time matches the target start time
   */
  const checkStartTime = () => {
    const now = new Date();
    updateCurrentTimeDisplay();

    if (now.getHours() === targetStartHour && now.getMinutes() === targetStartMin) {
      clearInterval(checkTimeIntervalRef);
      checkTimeIntervalRef = null;
      
      isRunning = true;
      readyToStart = false;
      isPaused = false;
      isExtraTime = false;
      
      if (intervalRef) clearInterval(intervalRef);
      intervalRef = setInterval(tick, 1000);
      
      updateUI();
    }
  };


  // --- Event Handlers ---

  /**
   * Handles the "Ready to Start" button click
   */
  const handleReadyToStart = () => {
    const examTime = calculateExamTime();
    const extra = calculateExtraTimeSeconds();
    const startingTime = el.startingTimeInput.value;

    if (!startingTime || examTime <= 0) {
      alert("Please set a valid Starting Time and Exam Duration.");
      return;
    }

    // Calculate times
    const [startHour, startMin] = startingTime.split(':').map(Number);
    targetStartHour = startHour;
    targetStartMin = startMin;
    
    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(startDate.getTime() + examTime * 1000);
    const extraEndDate = new Date(endDate.getTime() + extra * 1000);

    calculatedTimes = {
      start: startingTime,
      end: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
      extraEnd: `${String(extraEndDate.getHours()).padStart(2, '0')}:${String(extraEndDate.getMinutes()).padStart(2, '0')}`
    };

    // Update displays
    el.startTimeDisplay.textContent = calculatedTimes.start;
    el.endTimeDisplay.textContent = calculatedTimes.end;
    el.extraEndTimeDisplay.textContent = calculatedTimes.extraEnd;
    el.readyStartTime.textContent = `Exam will automatically start at ${startingTime}`;

    // Set state
    mainTimeRemaining = examTime;
    extraTimeRemaining = extra;
    readyToStart = true;

    // Update displays
    el.mainTimeDisplay.textContent = formatTime(mainTimeRemaining);
    el.extraTimeDisplay.textContent = formatTime(extraTimeRemaining);
    updateMainTimeColor();
    
    // Start the checker
    if (checkTimeIntervalRef) clearInterval(checkTimeIntervalRef);
    checkTimeIntervalRef = setInterval(checkStartTime, 1000);
    checkStartTime(); // Run once immediately
    
    updateUI();
  };

  /**
   * Handles the "Pause/Resume" button click
   */
  const pauseTimer = () => {
    isPaused = !isPaused;
    updateUI();
  };

  /**
   * Handles the "Reset/Cancel" button click
   */
  const resetTimer = () => {
    // Clear all intervals
    if (intervalRef) clearInterval(intervalRef);
    if (checkTimeIntervalRef) clearInterval(checkTimeIntervalRef);
    intervalRef = null;
    checkTimeIntervalRef = null;

    // Reset state
    isRunning = false;
    isPaused = false;
    readyToStart = false;
    isExtraTime = false;
    mainTimeRemaining = 0;
    extraTimeRemaining = 0;
    
    // Reset displays
    el.mainTimeDisplay.textContent = formatTime(0);
    el.extraTimeDisplay.textContent = formatTime(0);
    updateMainTimeColor();
    updatePreviews();
    
    // Update UI to initial state
    updateUI();
  };

  // --- Attach Event Listeners ---
  el.btnReadyStart.addEventListener('click', handleReadyToStart);
  el.btnPause.addEventListener('click', pauseTimer);
  el.btnReset.addEventListener('click', resetTimer);

  // Live update for preview boxes
  el.startingTimeInput.addEventListener('input', updatePreviews);
  el.examDurationInput.addEventListener('input', updatePreviews);
  el.extraTimeInput.addEventListener('input', updatePreviews);

  // --- Initial Setup ---
  updatePreviews(); // Populate previews on load
  updateUI();       // Set the initial UI state
});