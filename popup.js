document.addEventListener('DOMContentLoaded', function() {
  const EmotionalState = {
    ECSTATIC: 'happy-rock.svg',
    HAPPY: 'happy-rock.svg',
    CONTENT: 'sleeping-rock.svg',
    GRUMPY: 'angry-rock.svg',
    SAD: 'sad-rock.svg',
    DEPRESSED: 'sad-rock.svg'
  };

  // Store items configuration
  const StoreItems = {
    'cowboy-hat': { name: 'Cowboy Hat', price: 100, file: 'hats/cowboy-hat.svg' },
    'party-hat': { name: 'Party Hat', price: 50, file: 'hats/party-hat.svg' },
    'crown': { name: 'Royal Crown', price: 200, file: 'hats/crown.svg' }
  };

  const StateThresholds = {
    ECSTATIC: 90,
    HAPPY: 75,
    CONTENT: 60,
    GRUMPY: 40,
    SAD: 25,
    DEPRESSED: 0
  };

  // Emotional inertia: how quickly emotions can change
  const EmotionalInertia = {
    POSITIVE_CHANGE: 0.8,  // Slower to become happy
    NEGATIVE_CHANGE: 0.6   // Faster to become sad
  };

  let petState = {
    happiness: 100,
    cleanliness: 100,
    hunger: 100,
    lastInteraction: Date.now(),
    currentEmotion: EmotionalState.HAPPY,
    emotionalMomentum: 0,
    interactionCount: 0,
    lastEmotionChange: Date.now(),
    coins: 0,
    ownedHats: [],
    equippedHat: null
  };

  // Load saved state with proper type checking and defaults
  chrome.storage.local.get(['petState'], function(result) {
    if (result.petState) {
      const savedState = result.petState;
      
      // Merge saved state with defaults, ensuring all properties exist
      petState = {
        ...petState, // Start with default values
        happiness: Number(savedState.happiness) || 100,
        cleanliness: Number(savedState.cleanliness) || 100,
        hunger: Number(savedState.hunger) || 100,
        lastInteraction: Number(savedState.lastInteraction) || Date.now(),
        currentEmotion: savedState.currentEmotion || EmotionalState.HAPPY,
        emotionalMomentum: Number(savedState.emotionalMomentum) || 0,
        interactionCount: Number(savedState.interactionCount) || 0,
        lastEmotionChange: Number(savedState.lastEmotionChange) || Date.now(),
        coins: Number(savedState.coins) || 0,
        ownedHats: Array.isArray(savedState.ownedHats) ? savedState.ownedHats : [],
        equippedHat: savedState.equippedHat || null
      };

      // Calculate state decay since last interaction
      calculateStateDecay();
      
      // Update UI with loaded state
      updateStats();
      updateHatDisplay();
      updateEmotion();
      
      // Initialize store with current owned hats
      initializeStore();
    }
  });

  function saveState() {
    // Ensure all numbers are properly converted before saving
    const stateToSave = {
      ...petState,
      happiness: Number(petState.happiness),
      cleanliness: Number(petState.cleanliness),
      hunger: Number(petState.hunger),
      lastInteraction: Number(petState.lastInteraction),
      emotionalMomentum: Number(petState.emotionalMomentum),
      interactionCount: Number(petState.interactionCount),
      lastEmotionChange: Number(petState.lastEmotionChange),
      coins: Number(petState.coins),
      currentEmotion: petState.currentEmotion,
      ownedHats: petState.ownedHats,
      equippedHat: petState.equippedHat
    };
    
    chrome.storage.local.set({ petState: stateToSave }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving state:', chrome.runtime.lastError);
      }
    });
  }

  function updateStats() {
    document.getElementById('happiness').textContent = `${Math.round(petState.happiness)}%`;
    document.getElementById('cleanliness').textContent = `${Math.round(petState.cleanliness)}%`;
    document.getElementById('hunger').textContent = `${Math.round(petState.hunger)}%`;
    document.getElementById('coins').textContent = petState.coins;
    updateEmotion();
  }

  function calculateEmotionalScore() {
    const timeOfDay = new Date().getHours();
    const isNightTime = timeOfDay >= 22 || timeOfDay <= 6;
    
    // Base weights for each stat
    let weights = {
      happiness: 0.4,
      cleanliness: 0.3,
      hunger: 0.3
    };

    // Adjust weights based on conditions
    if (petState.hunger < 30) {
      weights.hunger += 0.2;  // Hunger becomes more important when low
      weights.happiness -= 0.1;
      weights.cleanliness -= 0.1;
    }

    if (isNightTime) {
      weights.happiness *= 0.8;  // Less emotional during night time
    }

    // Calculate weighted score
    const score = (
      petState.happiness * weights.happiness +
      petState.cleanliness * weights.cleanliness +
      petState.hunger * weights.hunger
    );

    // Apply emotional inertia with stronger effect
    const timeSinceLastChange = (Date.now() - petState.lastEmotionChange) / 1000;
    const inertiaFactor = Math.min(1, timeSinceLastChange / 60);  // Full effect after 60 seconds
    const currentScore = score * 0.7 + petState.emotionalMomentum * 0.3; // Blend current and previous scores
    
    return currentScore;
  }

  function updateEmotion() {
    const rockImage = document.getElementById('rockImage');
    const emotionalScore = calculateEmotionalScore();
    let newEmotion;

    // Determine new emotional state based on thresholds
    if (emotionalScore >= StateThresholds.ECSTATIC) newEmotion = EmotionalState.ECSTATIC;
    else if (emotionalScore >= StateThresholds.HAPPY) newEmotion = EmotionalState.HAPPY;
    else if (emotionalScore >= StateThresholds.CONTENT) newEmotion = EmotionalState.CONTENT;
    else if (emotionalScore >= StateThresholds.GRUMPY) newEmotion = EmotionalState.GRUMPY;
    else if (emotionalScore >= StateThresholds.SAD) newEmotion = EmotionalState.SAD;
    else newEmotion = EmotionalState.DEPRESSED;

    // Only update if emotion has significantly changed (add hysteresis)
    const emotionChanged = newEmotion !== petState.currentEmotion;
    const timeSinceLastChange = (Date.now() - petState.lastEmotionChange) / 1000;
    const minTimeBetweenChanges = 30; // Minimum seconds between emotion changes

    if (emotionChanged && timeSinceLastChange >= minTimeBetweenChanges) {
      petState.currentEmotion = newEmotion;
      petState.lastEmotionChange = Date.now();
      petState.emotionalMomentum = emotionalScore;
      rockImage.src = 'emotions/' + newEmotion;
      saveState(); // Save state when emotion changes
    } else {
      // Keep the current emotion if change is too recent
      rockImage.src = 'emotions/' + petState.currentEmotion;
    }
  }

  function calculateStateDecay() {
    const now = Date.now();
    const hoursSinceLastInteraction = (now - petState.lastInteraction) / (1000 * 60 * 60);
    
    // Decay rates (% per hour):
    // Hunger decays faster than other stats
    petState.hunger = Math.max(0, petState.hunger - (hoursSinceLastInteraction * 8));
    petState.happiness = Math.max(0, petState.happiness - (hoursSinceLastInteraction * 5));
    petState.cleanliness = Math.max(0, petState.cleanliness - (hoursSinceLastInteraction * 5));
    
    // Being hungry makes happiness decay faster
    if (petState.hunger < 30) {
      petState.happiness = Math.max(0, petState.happiness - (hoursSinceLastInteraction * 3));
    }
    
    petState.lastInteraction = now;
    updateStats();
    saveState();
  }

  function increaseHappiness(amount) {
    petState.happiness = Math.min(100, petState.happiness + amount);
    updateStats();
    saveState();
  }

  function increaseCleanliness(amount) {
    petState.cleanliness = Math.min(100, petState.cleanliness + amount);
    updateStats();
    saveState();
  }

  function increaseHunger(amount) {
    petState.hunger = Math.min(100, petState.hunger + amount);
    // Being fed also makes the rock a bit happier
    if (petState.hunger < 50) {
      increaseHappiness(amount * 0.3);
    }
    updateStats();
    saveState();
  }

  function createParticles(type, x, y, count = 6) {
    const container = document.createElement('div');
    container.className = 'particles';
    container.style.left = x + 'px';
    container.style.top = y + 'px';

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = `${type}-particle`;

      // Random position within container
      const angle = (Math.PI * 2 * i) / count;
      const distance = Math.random() * 20 + 10;
      particle.style.left = (Math.cos(angle) * distance) + 'px';
      particle.style.top = (Math.sin(angle) * distance) + 'px';
      
      // Random delay for more natural effect
      particle.style.animationDelay = `${Math.random() * 0.2}s`;
      
      container.appendChild(particle);
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 1000);
  }

  function animateRock(animation, particleType = null) {
    const rockContainer = document.getElementById('rockContainer');
    const rect = rockContainer.getBoundingClientRect();
    
    // Remove any existing animation classes
    rockContainer.classList.remove('bounce', 'wiggle', 'shine', 'polish', 'sparkle');
    void rockContainer.offsetWidth; // Trigger reflow
    rockContainer.classList.add(animation);

    if (particleType) {
      createParticles(particleType, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

  const messages = [
    "I ROCK!",
    "YOU'RE BOULDER THAN MOST!",
    "LIFE IS GNEISS WITH YOU!",
    "YOU MAKE ME FEEL LIKE A GEM!",
    "SCHIST JUST GOT REAL!",
    "YOU'RE MY CORNERSTONE!",
    "I'M MINERAL-Y HAPPY!",
    "THANKS FOR THE SNACK!"
  ];

  // Initialize UI and attach event listeners
  function initializeUI() {
    // Pet rock interactions
    document.getElementById('petButton').addEventListener('click', () => {
      increaseHappiness(10);
      earnCoins(5);
      animateRock('wiggle', 'heart');
    });

    document.getElementById('cleanButton').addEventListener('click', () => {
      increaseCleanliness(15);
      earnCoins(8);
      animateRock('shine', 'sparkle');
    });

    document.getElementById('feedButton').addEventListener('click', () => {
      increaseHunger(20);
      earnCoins(10);
      animateRock('bounce', 'food');
      if (Math.random() < 0.3) {
        showMessage(messages[messages.length - 1]);
      }
    });

    // Initialize store button
    const storeButton = document.getElementById('storeButton');
    const storeContainer = document.getElementById('storeContainer');
    
    if (storeButton && storeContainer) {
      storeButton.addEventListener('click', () => {
        console.log('Store button clicked');
        // Force reflow
        void storeContainer.offsetHeight;
        
        // Toggle visibility
        if (window.getComputedStyle(storeContainer).display === 'none') {
          storeContainer.style.display = 'block';
        } else {
          storeContainer.style.display = 'none';
        }
        console.log('Store container display:', storeContainer.style.display);
      });
    } else {
      console.error('Store elements not found:', { storeButton: !!storeButton, storeContainer: !!storeContainer });
    }
  }

  function showMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;
    document.body.appendChild(bubble);
    
    setTimeout(() => bubble.remove(), 2000);
  }

  function earnCoins(amount) {
    petState.coins += amount;
    updateStats();
    saveState();
  }

  function purchaseHat(hatId) {
    const hat = StoreItems[hatId];
    if (!hat) return;
    
    if (petState.coins >= hat.price && !petState.ownedHats.includes(hatId)) {
      petState.coins -= hat.price;
      petState.ownedHats.push(hatId);
      updateStats();
      saveState();
      showMessage("New hat acquired!");
      return true;
    }
    
    if (petState.ownedHats.includes(hatId)) {
      showMessage("You already own this hat!");
    } else {
      showMessage("Not enough coins!");
    }
    return false;
  }

  function equipHat(hatId) {
    if (petState.ownedHats.includes(hatId)) {
      petState.equippedHat = hatId;
      updateHatDisplay();
      saveState();
      return true;
    }
    return false;
  }

  function updateHatDisplay() {
    const hatImage = document.getElementById('hatImage');
    if (petState.equippedHat && StoreItems[petState.equippedHat]) {
      hatImage.src = StoreItems[petState.equippedHat].file;
      hatImage.style.display = 'block';
    } else {
      hatImage.style.display = 'none';
    }
  }

  // Initialize store items
  function initializeStore() {
    const storeItemsContainer = document.getElementById('storeItems');
    storeItemsContainer.innerHTML = ''; // Clear existing items
    
    Object.entries(StoreItems).forEach(([id, item]) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'store-item';
      itemElement.innerHTML = `
        <img src="${item.file}" alt="${item.name}" class="store-item-image">
        <div class="store-item-details">
          <div class="store-item-name">${item.name}</div>
          <div class="store-item-price">${item.price} coins</div>
        </div>
        <button class="pixel-button buy-button" data-hat-id="${id}">
          ${petState.ownedHats.includes(id) ? 'Equip' : 'Buy'}
        </button>
      `;

      const buyButton = itemElement.querySelector('.buy-button');
      buyButton.addEventListener('click', () => {
        if (petState.ownedHats.includes(id)) {
          if (equipHat(id)) {
            showMessage(`Equipped ${item.name}!`);
            updateStoreButtons(); // Update all buttons after equipping
          }
        } else {
          if (purchaseHat(id)) {
            buyButton.textContent = 'Equip';
            showMessage(`Purchased ${item.name}!`);
          }
        }
      });

      storeItemsContainer.appendChild(itemElement);
    });
  }

  // Add function to update store buttons
  function updateStoreButtons() {
    Object.entries(StoreItems).forEach(([id, item]) => {
      const button = document.querySelector(`button[data-hat-id="${id}"]`);
      if (button) {
        button.textContent = petState.ownedHats.includes(id) ? 'Equip' : 'Buy';
      }
    });
  }

  // Initialize everything
  initializeStore();
  initializeUI();
  updateHatDisplay();
  updateStats();
}); 