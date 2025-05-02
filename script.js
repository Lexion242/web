// ======================
// Configuration
// ======================
const CONFIG = Object.freeze({
    particles: {
      elementId: 'particles-js',
      density: 80,
      colors: ['#8b5cf6', '#6366f1', '#4f46e5'],
      speed: 0.8,
      size: 3,
      opacity: 0.5
    },
    animations: {
      scrollThreshold: 0.15,
      staggerDelay: 100,
      scrollTransition: {
        duration: 0.3,
        ease: "power2.out"
      }
    },
    selectors: {
      loading: '#loading',
      progressBar: '[data-progress-bar]',
      scrollAnimate: '[data-scroll-animate]',
      stagger: '[data-stagger]',
      faqItems: '[data-faq-item]',
      commandItems: '[data-command-item]',
      commandLists: {
        discord: '#discord-commands [data-command-list]',
        minecraft: '#minecraft-commands [data-command-list]'
      }
    },
    urls: {
      commands: 'config.json',
      firefoxDownload: 'https://www.mozilla.org/firefox/download/'
    },
    classes: {
      active: 'active',
      visible: 'visible',
      error: 'error-message'
    }
  });
  
  // ======================
  // Debug Logger
  // ======================
  const Debug = {
    log: (...args) => console.log('[DEBUG]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    time: (label) => console.time('[TIMING] ' + label),
    timeEnd: (label) => console.timeEnd('[TIMING] ' + label)
  };
  
  // ======================
  // DOM Utilities
  // ======================
  class DOMUtils {
    static createElement(tag, options = {}) {
        const el = document.createElement(tag);
        const { classes, attributes, children, html, text } = options;
        
        if (classes) el.className = classes;
        if (attributes) Object.entries(attributes).forEach(([k, v]) => el.setAttribute(k, v));
        if (html) el.innerHTML = DOMPurify.sanitize(html);
        if (text) el.textContent = text;
        if (children) children.forEach(child => el.appendChild(child));
        
        return el;
    }

    static handleError(message, context = document.querySelector('main')) {
        Debug.error('Displaying error:', message);
        const errorEl = DOMUtils.createElement('div', {
            classes: CONFIG.classes.error,
            html: DOMPurify.sanitize(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${message}</span>
            `)
        });
        
        context.prepend(errorEl);
        setTimeout(() => errorEl.remove(), 5000);
        return errorEl;
    }

    static query(selector, parent = document) {
        return parent.querySelector(selector);
    }

    static queryAll(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }
}
  // ======================
  // Browser Support Check
  // ======================
  class BrowserSupport {
    static requiredFeatures = [
        'IntersectionObserver',
        'Promise',
        'fetch',
        'requestAnimationFrame'
    ];

    static isSupported() {
        Debug.log('Checking browser support...');
        const supported = this.requiredFeatures.every(feature => {
            const isSupported = feature in window;
            if (!isSupported) Debug.warn('Missing feature:', feature);
            return isSupported;
        });
        Debug.log(`Browser supported: ${supported}`);
        return supported;
    }

    static showUnsupportedError() {
        Debug.log('Showing unsupported browser error');
        const errorHtml = DOMPurify.sanitize(`
            <div class="fixed inset-0 flex items-center justify-center bg-black p-8 text-center">
                <div class="max-w-md">
                    <h2 class="text-2xl font-bold text-red-500 mb-4">Browser Not Supported</h2>
                    <p class="text-gray-300 mb-6">Please use a modern browser like Firefox, Chrome, or Edge to view this website.</p>
                    <p class="text-gray-400">Redirecting to Firefox download page...</p>
                </div>
            </div>
        `);
        
        document.body.innerHTML = errorHtml;
        
        setTimeout(() => {
            window.location.href = CONFIG.urls.firefoxDownload;
        }, 5000);
    }
}
  // ======================
  // Scroll Animations
  // ======================

class ScrollAnimator {
    static observer = null;

    static init() {
        Debug.log('Initializing ScrollAnimator...');
        try {
            if (!this.observer) {
                Debug.log('Creating new IntersectionObserver');
                this.observer = new IntersectionObserver(
                    this.handleIntersect.bind(this), 
                    { threshold: CONFIG.animations.scrollThreshold }
                );

                // Observe all scroll-animate elements
                const elements = DOMUtils.queryAll(CONFIG.selectors.scrollAnimate);
                Debug.log(`Observing ${elements.length} scroll-animate elements`);
                elements.forEach(el => this.observer.observe(el));
            }
        } catch (error) {
            Debug.error('ScrollAnimator init failed:', error);
            throw error;
        }
    }

    static handleIntersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                target.classList.add(CONFIG.classes.visible);

                // Animate child elements with data-stagger
                if (target.hasAttribute('data-stagger') || target.querySelector('[data-stagger]')) {
                    this.processStagger(target);
                }

                // Special handling for credit items
                if (target.classList.contains('credits-section')) {
                    this.animateCreditItems(target);
                }

                this.observer.unobserve(target);
            }
        });
    }
    static animateCreditItems(container) {
        const creditItems = container.querySelectorAll('.credit-item');
        gsap.to(creditItems, {
            duration: 0.8,
            y: 0,
            opacity: 1,
            stagger: 0.15,
            ease: "power3.out",
            overwrite: true
        });
    }

    static processStagger(container) {
        const elements = Array.from(container.children);
        elements.forEach((el, i) => {
            el.style.transitionDelay = `${i * CONFIG.animations.staggerDelay}ms`;
        });
    }
}
  
  // ======================
  // Particles Manager
  // ======================
  class ParticleManager {
    static init() {
      Debug.log('Initializing ParticleManager...');
      try {
        const particlesContainer = DOMUtils.query(`#${CONFIG.particles.elementId}`);
        if (!particlesContainer) {
          Debug.warn('Particles container not found');
          return;
        }
        
        if (typeof particlesJS !== 'function') {
          Debug.warn('particlesJS not loaded');
          return;
        }
  
        Debug.log('Initializing particles.js');
        particlesJS(CONFIG.particles.elementId, {
          particles: {
            number: { 
              value: CONFIG.particles.density,
              density: { enable: true, value_area: 800 }
            },
            color: { value: CONFIG.particles.colors },
            opacity: {
              value: CONFIG.particles.opacity,
              random: true
            },
            size: {
              value: CONFIG.particles.size,
              random: true
            },
            move: {
              enable: true,
              speed: CONFIG.particles.speed,
              direction: "none",
              random: true,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: { enable: true, mode: "repulse" },
              onclick: { enable: true, mode: "push" },
              resize: true
            }
          }
        });
      } catch (error) {
        Debug.error('ParticleManager init failed:', error);
        DOMUtils.handleError('Particle effect failed to load');
      }
    }
  }
  
  // ======================
  // Scroll Progress
  // ======================
  class ScrollProgress {
    static progressBar = null;
  
    static init() {
      Debug.log('Initializing ScrollProgress...');
      try {
        if (!DOMUtils.query(CONFIG.selectors.progressBar)) {
          Debug.log('Creating new progress bar');
          this.progressBar = DOMUtils.createElement('div', {
            attributes: {
              'data-progress-bar': '',
              'aria-hidden': 'true'
            },
            classes: 'fixed top-0 left-0 h-1 bg-purple-500 origin-left transform scale-x-0 z-50'
          });
          document.body.prepend(this.progressBar);
        } else {
          this.progressBar = DOMUtils.query(CONFIG.selectors.progressBar);
        }
  
        window.addEventListener('scroll', this.throttle(this.update.bind(this), 16));
        this.update();
        Debug.log('Scroll progress initialized');
      } catch (error) {
        Debug.error('ScrollProgress init failed:', error);
        throw error;
      }
    }
  
    static update() {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollY / height, 1);
      
      gsap.to(this.progressBar, {
        scaleX: progress,
        duration: CONFIG.animations.scrollTransition.duration,
        ease: CONFIG.animations.scrollTransition.ease
      });
    }
  
    static throttle(fn, wait) {
      let lastTime = 0;
      return function() {
        const now = Date.now();
        if (now - lastTime >= wait) {
          fn.apply(this, arguments);
          lastTime = now;
        }
      };
    }
  }

  // ======================
  // Command Loader
  // ======================
class CommandLoader {
    static cache = null;
    static securityReport = {
        sanitizedCommands: 0,
        blockedInjectionAttempts: 0,
        validationErrors: 0
    };

    // XSS Protection Utilities
    static escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/[&<>"'`=\/]/g, (match) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#x60;',
            '=': '&#x3D;',
            '/': '&#x2F;'
        }[match] || match));
    }

    static sanitizeCommand(command) {
        try {
            if (!command || typeof command !== 'object') {
                Debug.warn('Invalid command structure', command);
                this.securityReport.validationErrors++;
                return null;
            }

            const safeCommand = {
                name: this.escapeHtml(command.name),
                description: this.escapeHtml(command.description),
                args: []
            };

            if (Array.isArray(command.args)) {
                safeCommand.args = command.args.map(arg => {
                    if (!arg || typeof arg !== 'object') return null;
                    return {
                        name: this.escapeHtml(arg.name),
                        type: arg.type === 'required' ? 'required' : 'optional'
                    };
                }).filter(Boolean);
            }

            this.securityReport.sanitizedCommands++;
            return safeCommand;
        } catch (error) {
            Debug.error('Command sanitization failed:', error);
            this.securityReport.validationErrors++;
            return null;
        }
    }

    // Debug Utilities
    static logSecurityReport() {
        Debug.log('[Security Report]', {
            ...this.securityReport,
            cacheStatus: this.cache ? 'loaded' : 'empty'
        });
    }

    // Core Methods
    static async load() {
        Debug.time('CommandLoader.load');
        try {
            if (this.cache) {
                Debug.log('Returning cached commands');
                return this.cache;
            }

            Debug.log('Fetching commands from:', CONFIG.urls.commands);
            const response = await fetch(CONFIG.urls.commands);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const jsonData = await response.json();
            Debug.log('Raw command data received:', jsonData);

            // Validate and sanitize all commands
            this.cache = {
                discord: jsonData.discord.map(cmd => this.sanitizeCommand(cmd)).filter(Boolean),
                minecraft: jsonData.minecraft.map(cmd => this.sanitizeCommand(cmd)).filter(Boolean)
            };

            Debug.log('Sanitized command cache created');
            this.logSecurityReport();
            
            return this.cache;
        } catch (error) {
            Debug.error('Command load error:', error);
            DOMUtils.handleError('Failed to load commands. Please try again later.');
            throw error;
        } finally {
            Debug.timeEnd('CommandLoader.load');
        }
    }

    static createCommandElement(command) {
      const safeCommand = this.sanitizeCommand(command);
      if (!safeCommand) {
          Debug.warn('Skipping invalid command');
          return document.createDocumentFragment();
      }

      const argsElements = safeCommand.args.map(arg => this.createArgElement(arg));
      const argsContainer = DOMUtils.createElement('div', {
          classes: 'flex gap-2 flex-wrap mt-2',
          children: argsElements
      });

      return DOMUtils.createElement('li', {
          attributes: {
              'data-command-item': '',
              'aria-describedby': `command-desc-${safeCommand.name.replace(/\s+/g, '-')}`
          },
          classes: 'command-item bg-gray-800 p-4 rounded-lg border border-gray-700 transition-all duration-300',
          children: [
              this.createCommandHeader(safeCommand),
              argsContainer,
              this.createDescriptionElement(safeCommand)
          ]
      });
  }

  static createCommandHeader(command) {
      const commandCode = DOMUtils.createElement('code', {
          classes: 'font-mono bg-gray-700 px-2 py-1 rounded text-sm',
          text: command.name
      });

      const iconSvg = DOMPurify.sanitize(`
          <svg class="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
      `);

      return DOMUtils.createElement('div', {
          classes: 'flex items-center gap-3 mb-2',
          children: [
              DOMUtils.createElement('div', { html: iconSvg }),
              commandCode
          ]
      });
  }

  static createArgElement(arg) {
      if (!arg || !arg.name) {
          Debug.warn('Invalid argument structure', arg);
          return document.createDocumentFragment();
      }

      const isRequired = arg.type === 'required';
      const iconSvg = isRequired ?
          DOMPurify.sanitize(`
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
          `) :
          DOMPurify.sanitize(`
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0z" clip-rule="evenodd"/>
              </svg>
          `);

      const argText = isRequired ? 
          `&lt;${arg.name}&gt;` : 
          `[${arg.name}]`;

      return DOMUtils.createElement('span', {
          classes: `px-3 py-1 rounded-full text-xs flex items-center gap-2 ${
              isRequired ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'
          }`,
          attributes: {
              'data-argument': '',
              'data-required': isRequired.toString()
          },
          html: DOMPurify.sanitize(`${iconSvg}<span>${argText}</span>`)
      });
  }

  static createDescriptionElement(command) {
      return DOMUtils.createElement('div', {
          classes: 'text-gray-300 mt-2 pl-2 border-l-2 border-purple-500',
          attributes: { 
              id: `command-desc-${command.name.replace(/\s+/g, '-')}`
          },
          text: command.description
      });
  }


    static async init() {
        Debug.log('Initializing CommandLoader...');
        try {
            const commands = await this.load();
            
            const injectCommands = (selector, commandList) => {
                const container = DOMUtils.query(selector);
                if (!container) {
                    Debug.warn(`Container not found: ${selector}`);
                    return;
                }

                Debug.log(`Injecting commands into: ${selector}`);
                container.textContent = ''; // Safe clear

                const fragment = document.createDocumentFragment();
                commandList.forEach(cmd => {
                    try {
                        const el = this.createCommandElement(cmd);
                        if (el) fragment.appendChild(el);
                    } catch (error) {
                        Debug.error('Command injection failed:', error);
                        this.securityReport.blockedInjectionAttempts++;
                    }
                });

                container.appendChild(fragment);
                Debug.log(`Injected ${fragment.children.length} commands`);
            };

            injectCommands(CONFIG.selectors.commandLists.discord, commands.discord);
            injectCommands(CONFIG.selectors.commandLists.minecraft, commands.minecraft);

            const loadingElement = DOMUtils.query(CONFIG.selectors.loading);
            if (loadingElement) {
                loadingElement.style.opacity = '0';
                setTimeout(() => loadingElement.remove(), 500);
            }

            this.logSecurityReport();
        } catch (error) {
            Debug.error('Command initialization error:', error);
            DOMUtils.handleError('Failed to load commands. Please check the console.');
        }
    }
}
  
  // ======================
  // FAQ Accordion
  // ======================
  class FAQAccordion {
    static init() {
      Debug.log('Initializing FAQAccordion...');
      try {
        const items = DOMUtils.queryAll(CONFIG.selectors.faqItems);
        Debug.log(`Found ${items.length} FAQ items`);
        
        items.forEach(item => {
          const button = item.querySelector('[data-faq-toggle]');
          if (button) {
            button.setAttribute('aria-expanded', 'false');
            button.addEventListener('click', () => this.toggleItem(item));
          }
        });
      } catch (error) {
        Debug.error('FAQAccordion init failed:', error);
      }
    }
  
    static toggleItem(item) {
      const isOpening = !item.classList.contains(CONFIG.classes.active);
      const button = item.querySelector('[data-faq-toggle]');
    
      const chevron = item.querySelector('.faq-chevron');
    
      // Close all items first
      DOMUtils.queryAll(CONFIG.selectors.faqItems).forEach(i => {
        i.classList.remove(CONFIG.classes.active);
        i.querySelector('[data-faq-toggle]')?.setAttribute('aria-expanded', 'false');
        
        const otherChevron = i.querySelector('.faq-chevron');
        if (otherChevron) {
          otherChevron.classList.remove('rotate-180');
        }
      });
    
      // Open current item if it was closed
      if (isOpening) {
        item.classList.add(CONFIG.classes.active);
        button?.setAttribute('aria-expanded', 'true');
        if (chevron) {
          chevron.classList.add('rotate-180');
        }
        this.scrollToItem(item);
      }
    }
    
  
    static scrollToItem(item) {
      const itemTop = item.getBoundingClientRect().top;
      const offset = 100; // Space from top of viewport
      
      if (itemTop < offset) {
        window.scrollBy({
          top: itemTop - offset,
          behavior: 'smooth'
        });
      }
    }
  }
  
  // ======================
  // Initial Animations
  // ======================
  class InitialAnimations {
    static init() {
      Debug.log('Initializing InitialAnimations...');
      try {
        if (typeof gsap === 'undefined') {
          Debug.warn('GSAP not loaded');
          return;
        }
        
        this.animateLogo();
        this.animateHeadings();
      } catch (error) {
        Debug.error('InitialAnimations init failed:', error);
      }
    }
  
    static animateLogo() {
      const logo = DOMUtils.query('#yescom-logo');
      if (logo) {
        Debug.log('Animating logo');
        gsap.from(logo, {
          duration: 1.5,
          y: -50,
          opacity: 0,
          ease: "power4.out"
        });
      }
    }
  
    static animateHeadings() {
      const headings = DOMUtils.queryAll('h1, h2');
      Debug.log(`Animating ${headings.length} headings`);
      headings.forEach((heading, i) => {
        gsap.from(heading, {
          duration: 1.2,
          y: 30,
          opacity: 0,
          delay: 0.3 + (i * 0.1),
          ease: "back.out(1.7)"
        });
      });
    }
  }
  
  // ======================
  // Main Application
  // ======================
  class App {
    static async init() {
      Debug.log('App initialization started');
      Debug.time('App.init');
  
      try {
        if (!BrowserSupport.isSupported()) {
          Debug.log('Browser not supported');
          return BrowserSupport.showUnsupportedError();
        }
  
        Debug.log('Initializing components:');
        
        Debug.log('- ScrollAnimator');
        ScrollAnimator.init();
        
        Debug.log('- ParticleManager');
        ParticleManager.init();
        
        Debug.log('- ScrollProgress');
        ScrollProgress.init();
        
        Debug.log('- InitialAnimations');
        InitialAnimations.init();
        
        Debug.log('- CommandLoader');
        await CommandLoader.init();
        
        Debug.log('- FAQAccordion');
        FAQAccordion.init();
        
        Debug.log('- Command hover effects');
        this.setupCommandHoverEffects();
  
        Debug.log('All components initialized successfully');
      } catch (error) {
        Debug.error('Critical initialization error:', error);
        DOMUtils.handleError('Failed to initialize website features. Please refresh the page.');
      } finally {
        Debug.timeEnd('App.init');
      }
    }
  
    static setupCommandHoverEffects() {
      Debug.log('Setting up command hover effects');
      try {
        document.addEventListener('mousemove', (e) => {
          const commandItem = e.target.closest(CONFIG.selectors.commandItems);
          if (commandItem) {
            const rect = commandItem.getBoundingClientRect();
            commandItem.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            commandItem.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
          }
        }, { passive: true });
      } catch (error) {
        Debug.error('Hover effect setup failed:', error);
      }
    }

     logo = document.getElementById('yescom-logo');
if (logo) {
    const container = document.createElement('div');
    container.className = 'logo-radar-container';
    logo.parentNode.insertBefore(container, logo);
    container.appendChild(logo);
}
  }
  
  // ======================
  // Start the Application
  // ======================
  Debug.log('Registering DOMContentLoaded listener');
  document.addEventListener('DOMContentLoaded', () => {
    Debug.log('DOMContentLoaded event received');
    App.init().catch(error => {
      Debug.error('Uncaught initialization error:', error);
    });
  });
  
   // Clean up on window unload
  window.addEventListener('beforeunload', () => {
    Debug.log('Cleaning up before unload');
    if (ScrollAnimator.observer) {
      ScrollAnimator.observer.disconnect();
    }
  });