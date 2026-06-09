// Global error logging for easier debugging
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global JS Error Caught:", message, "at", source, ":", lineno, ":", colno);
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.bottom = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.95)';
    errorDiv.style.color = '#fff';
    errorDiv.style.padding = '16px';
    errorDiv.style.borderRadius = '12px';
    errorDiv.style.zIndex = '99999';
    errorDiv.style.fontFamily = 'monospace';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    errorDiv.style.maxWidth = '450px';
    errorDiv.style.border = '1px solid rgba(255,255,255,0.2)';
    errorDiv.style.wordBreak = 'break-all';
    errorDiv.innerHTML = `
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">⚠️</span> JavaScript Error detected
        </div>
        <div style="margin-bottom: 4px;"><strong>Msg:</strong> ${message}</div>
        <div style="opacity: 0.8; font-size: 11px;"><strong>Location:</strong> ${source}:${lineno}:${colno}</div>
    `;
    document.body.appendChild(errorDiv);
    return false;
};

// Safely call lucide.createIcons
function createIconsSafe() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error("lucide.createIcons error:", e);
        }
    } else {
        console.warn("Lucide library is not loaded yet or unavailable.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Initializing LocalSearch Clone...");
    
    // DOM Elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchHero = document.getElementById('search-hero');
    const blueprintSection = document.getElementById('blueprint-section');
    const resultsSection = document.getElementById('results-section');
    const displayQuery = document.getElementById('display-query');
    const sourcesGrid = document.getElementById('sources-grid');
    const answerBody = document.getElementById('answer-body');
    const submitBtn = document.getElementById('submit-btn');
    const newSearchBtn = document.getElementById('new-search-btn');
    
    // Scraper Mode Selector
    const modeRaw = document.getElementById('mode-raw');
    const modeClean = document.getElementById('mode-clean');
    
    // Status Indicators
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    
    // Warnings and Banners
    const pipelineWarning = document.getElementById('pipeline-warning');
    const pipelineSuccess = document.getElementById('pipeline-success');
    
    // Debug Inspector Sidebar
    const debugSidebar = document.getElementById('debug-sidebar');
    const toggleDebugBtn = document.getElementById('toggle-debug-btn');
    const closeDebugBtn = document.getElementById('close-debug-btn');
    

    const inspectorOllamaRunning = document.getElementById('inspector-ollama-running');
    const inspectorModels = document.getElementById('inspector-models');
    const statsRawChars = document.getElementById('stats-raw-chars');
    const statsCleanChars = document.getElementById('stats-clean-chars');
    const statsWastedChars = document.getElementById('stats-wasted-chars');
    const debugScrapedContent = document.getElementById('debug-scraped-content');
    const debugPromptContent = document.getElementById('debug-prompt-content');
    
    // Debug Tabs
    const btnTabScraped = document.getElementById('btn-tab-scraped');
    const btnTabPrompt = document.getElementById('btn-tab-prompt');
    const paneScraped = document.getElementById('pane-scraped');
    const panePrompt = document.getElementById('pane-prompt');
    
    // Focus Dropdown and File Attachments DOM Elements
    const focusBtn = document.getElementById('focus-btn');
    const focusBtnText = document.getElementById('focus-btn-text');
    const focusDropdownMenu = document.getElementById('focus-dropdown-menu');
    const focusDropdownItems = document.querySelectorAll('.focus-dropdown-item');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const searchAttachmentsContainer = document.getElementById('search-attachments-container');

    // State Variables
    let currentSources = [];
    let accumulatedText = "";
    let focusMode = 'web';
    let attachedFiles = [];

    // Initialize PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Render all lucide icons (moved here from HTML so app.js controls the lifecycle)
    createIconsSafe();
    
    // Auto-resize search input textarea
    searchInput.addEventListener('input', () => {
        searchInput.style.height = 'auto';
        searchInput.style.height = (searchInput.scrollHeight) + 'px';
    });

    // Handle enter key to submit search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            searchForm.requestSubmit();
        }
    });

    // Toggle Focus Dropdown Menu
    focusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        focusDropdownMenu.classList.toggle('hidden');
    });

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!focusDropdownWrapperContains(e.target)) {
            focusDropdownMenu.classList.add('hidden');
        }
    });

    function focusDropdownWrapperContains(target) {
        const wrapper = document.querySelector('.focus-dropdown-wrapper');
        return wrapper && wrapper.contains(target);
    }

    // Select Focus Mode
    focusDropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            focusDropdownItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            focusMode = item.getAttribute('data-value');
            const iconName = item.getAttribute('data-icon');
            const modeTitle = item.querySelector('.item-title').innerText;

            // Update Focus Button label
            focusBtnText.innerText = modeTitle === 'All' ? 'Focus' : modeTitle;

            // Update the icon: after lucide.createIcons() runs, <i> tags become <svg>.
            // We must remove the existing icon (svg or i) and insert a fresh <i> tag.
            const existingIcon = focusBtn.querySelector('svg, i');
            if (existingIcon) existingIcon.remove();
            const newIcon = document.createElement('i');
            newIcon.setAttribute('data-lucide', iconName);
            focusBtn.insertBefore(newIcon, focusBtnText);
            createIconsSafe();

            // Hide dropdown
            focusDropdownMenu.classList.add('hidden');
        });
    });

    // Trigger File Input on Attach Button Click
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle File Selection and Parsing
    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files);
        if (files.length === 0) return;

        for (const file of files) {
            // Check for duplicates
            if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue;
            }

            try {
                let content = "";
                if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                    content = await parsePdfFile(file);
                } else {
                    content = await readTextFile(file);
                }

                attachedFiles.push({
                    name: file.name,
                    size: file.size,
                    content: content
                });
            } catch (err) {
                console.error(`Error reading file ${file.name}:`, err);
                alert(`Error reading file ${file.name}: ${err.message}`);
            }
        }

        renderAttachments();
        fileInput.value = ""; // Reset file input
    });

    // Read plain text file
    function readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }

    // Parse PDF client-side
    function parsePdfFile(file) {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib === 'undefined') {
                reject(new Error("PDF.js library is not loaded. Cannot parse PDF."));
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const strings = content.items.map(item => item.str);
                        fullText += strings.join(" ") + "\n";
                    }
                    resolve(fullText);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Failed to read PDF file"));
            reader.readAsArrayBuffer(file);
        });
    }

    // Render Attachment Pills in UI
    function renderAttachments() {
        searchAttachmentsContainer.innerHTML = "";
        
        if (attachedFiles.length === 0) {
            searchAttachmentsContainer.classList.add('hidden');
            searchInput.required = true;
            return;
        }

        searchAttachmentsContainer.classList.remove('hidden');
        searchInput.required = false;

        attachedFiles.forEach((file, index) => {
            const pill = document.createElement('div');
            pill.className = "attachment-pill";
            
            const isPdf = file.name.endsWith(".pdf");
            const iconName = isPdf ? "file-digit" : "file-text";
            const sizeStr = formatBytes(file.size);

            pill.innerHTML = `
                <i data-lucide="${iconName}"></i>
                <span class="pill-name" title="${file.name}">${file.name}</span>
                <span class="pill-size">${sizeStr}</span>
                <button type="button" class="pill-remove-btn" data-index="${index}" title="Remove file">
                    <i data-lucide="x"></i>
                </button>
            `;

            // Handle delete file
            pill.querySelector('.pill-remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                attachedFiles.splice(index, 1);
                renderAttachments();
            });

            searchAttachmentsContainer.appendChild(pill);
        });

        createIconsSafe();
    }

    // Format file sizes helper
    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Check backend and Ollama status on load
    checkStatus();
    setInterval(checkStatus, 15000); // Check status every 15 seconds

    // Initial SVG connector draw
    setTimeout(drawConnectors, 500);
    window.addEventListener('resize', drawConnectors);

    // Debug Panel Toggle
    toggleDebugBtn.addEventListener('click', toggleDebug);
    closeDebugBtn.addEventListener('click', toggleDebug);
    
    // Citation Click Event Delegation
    answerBody.addEventListener('click', (e) => {
        const badge = e.target.closest('.citation-badge');
        if (!badge) return;
        
        e.preventDefault();
        const idx = badge.getAttribute('data-index');
        const card = document.getElementById(`source-card-${idx}`);
        
        if (card) {
            // Scroll to the card smoothly
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Add temporary highlight animation
            card.classList.add('highlight');
            setTimeout(() => {
                card.classList.remove('highlight');
            }, 2000);
        }
    });
    
    function toggleDebug() {
        debugSidebar.classList.toggle('collapsed');
        setTimeout(drawConnectors, 350); // Redraw since workspace shifted
    }

    // Debug Tabs switcher
    btnTabScraped.addEventListener('click', () => {
        btnTabScraped.classList.add('active');
        btnTabPrompt.classList.remove('active');
        paneScraped.classList.add('active');
        panePrompt.classList.remove('active');
    });

    btnTabPrompt.addEventListener('click', () => {
        btnTabPrompt.classList.add('active');
        btnTabScraped.classList.remove('active');
        panePrompt.classList.add('active');
        paneScraped.classList.remove('active');
    });

    // New Search / Reset UI
    newSearchBtn.addEventListener('click', () => {
        resetUI();
    });

    // Main Form Submit Handler
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let query = searchInput.value.trim();
        if (!query && attachedFiles.length === 0) return;
        if (!query && attachedFiles.length > 0) {
            query = "Analyze the attached document(s)";
        }
        
        await runPipeline(query);
    });

    // Reset UI to Landing Screen
    function resetUI() {
        searchHero.classList.remove('compact');
        resultsSection.classList.add('hidden');
        searchInput.value = "";
        searchInput.style.height = 'auto';
        
        // Reset Nodes
        resetNodes();
        
        // Clear variables
        currentSources = [];
        accumulatedText = "";
        attachedFiles = [];
        renderAttachments();
        answerBody.innerHTML = "";
        sourcesGrid.innerHTML = "";
        
        // Reset banners
        pipelineWarning.classList.add('hidden');
        pipelineSuccess.classList.add('hidden');
        
        // Reset stats
        statsRawChars.innerText = "0 chars";
        statsCleanChars.innerText = "0 chars";
        statsWastedChars.innerText = "0 chars (0%)";
        statsWastedChars.className = "status-val";
        debugScrapedContent.innerText = "Waiting for search...";
        debugPromptContent.innerText = "Waiting for search...";
        
        setTimeout(drawConnectors, 100);
    }

    // Reset RAG nodes
    function resetNodes() {
        const nodes = ['node-query', 'node-search', 'node-scraper', 'node-context', 'node-llm', 'node-answer'];
        nodes.forEach(id => {
            const el = document.getElementById(id);
            el.className = 'blueprint-node';
            el.querySelector('.node-status').innerText = 'Idle';
        });
        
        const paths = ['path-1-2', 'path-2-3', 'path-3-4', 'path-4-5', 'path-5-6'];
        paths.forEach(id => {
            const el = document.getElementById(id);
            el.className = 'flow-path';
        });
    }

    // Set Node State helper
    function setNodeState(nodeId, state, statusText) {
        const node = document.getElementById(nodeId);
        if (!node) return;
        
        // remove old state classes
        node.classList.remove('loading', 'success', 'fail', 'skipped');
        
        // add new state
        if (state !== 'idle') {
            node.classList.add(state);
        }
        
        node.querySelector('.node-status').innerText = statusText;
    }

    // Set Path State helper
    function setPathState(pathId, state) {
        const path = document.getElementById(pathId);
        if (!path) return;
        
        path.classList.remove('active', 'success', 'fail');
        if (state !== 'idle') {
            path.classList.add(state);
        }
    }

    // Status Checker
    async function checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.ollama.running) {
                statusDot.className = 'status-indicator online';
                statusDot.style.backgroundColor = '';
                statusLabel.innerText = `Ollama Online: ${data.ollama.models[0] || 'Llama 3.1'}`;
                inspectorOllamaRunning.innerText = 'Connected ✅';
                inspectorOllamaRunning.style.color = 'var(--color-success)';
                inspectorModels.innerText = data.ollama.models.join(', ') || 'None (Please pull a model)';
            } else {
                statusDot.className = 'status-indicator offline';
                statusDot.style.backgroundColor = '';
                statusLabel.innerText = 'Ollama Offline';
                inspectorOllamaRunning.innerText = 'Offline ⚠️';
                inspectorOllamaRunning.style.color = 'var(--color-fail)';
                inspectorModels.innerText = 'None';
            }
        } catch (e) {
            statusDot.className = 'status-indicator offline';
            statusDot.style.backgroundColor = '';
            statusLabel.innerText = 'Server Offline';
            inspectorOllamaRunning.innerText = 'API Offline 🛑';
            inspectorOllamaRunning.style.color = 'var(--color-fail)';
            inspectorModels.innerText = 'Failed to connect to backend';
        }
    }

    // Main RAG Pipeline orchestrator
    async function runPipeline(query) {
        // Toggle view
        searchHero.classList.add('compact');
        resultsSection.classList.remove('hidden');
        displayQuery.innerText = `"${query}"`;
        
        submitBtn.disabled = true;
        resetNodes();
        pipelineWarning.classList.add('hidden');
        pipelineSuccess.classList.add('hidden');
        
        try {
            // STEP 1: User Query
            setNodeState('node-query', 'success', 'Query Active');

            let processedSources = [];
            let rawCharacters = 0;
            let cleanCharacters = 0;
            let formattedScrapedTextForInspector = "";
            const scraperMode = modeRaw.checked ? 'raw' : 'clean';

            // Add local file attachments first as sources
            const localSources = attachedFiles.map((file, idx) => {
                const contentLen = file.content.length;
                cleanCharacters += contentLen;
                rawCharacters += contentLen;
                
                formattedScrapedTextForInspector += `=== ATTACHED FILE [${idx + 1}]: ${file.name} ===\n${file.content.substring(0, 1500)}${file.content.length > 1500 ? '...' : ''}\n\n`;

                return {
                    title: `Attached: ${file.name}`,
                    url: `local-file://${file.name}`,
                    content: file.content
                };
            });

            if (focusMode === 'writing') {
                // STEP 2 & 3: Bypassed for Writing Mode
                setNodeState('node-search', 'skipped', 'Skipped (Writing)');
                setPathState('path-1-2', 'idle');
                
                setNodeState('node-scraper', 'skipped', 'Skipped (Writing)');
                setPathState('path-2-3', 'idle');
                
                processedSources = [...localSources];
            } else {
                // Modify search query based on selected Focus Mode
                let modifiedQuery = query;
                if (focusMode === 'academic') {
                    modifiedQuery = `${query} site:arxiv.org OR site:ncbi.nlm.nih.gov`;
                } else if (focusMode === 'youtube') {
                    modifiedQuery = `${query} site:youtube.com`;
                } else if (focusMode === 'reddit') {
                    modifiedQuery = `${query} site:reddit.com`;
                }

                // STEP 2: Web Search
                setNodeState('node-search', 'loading', 'Searching...');
                setPathState('path-1-2', 'active');
                
                const searchResponse = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: modifiedQuery })
                });
                const searchData = await searchResponse.json();
                currentSources = searchData.results;
                
                setNodeState('node-search', 'success', `Found ${currentSources.length} URLs`);
                setPathState('path-1-2', 'success');
                
                // STEP 3: Web Scraper
                setNodeState('node-scraper', 'loading', 'Scraping sites...');
                setPathState('path-2-3', 'active');
                
                // Toggle specific color on Scraper icon for Raw vs Clean mode visual cue
                const scraperIcon = document.getElementById('scraper-node-icon');
                if (scraperIcon) {
                    if (scraperMode === 'raw') {
                        scraperIcon.style.color = 'var(--color-fail)';
                    } else {
                        scraperIcon.style.color = 'var(--color-success)';
                    }
                }
                
                let scrapedResults = [];
                if (currentSources.length > 0) {
                    const scrapeResponse = await fetch('/api/scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ urls: currentSources.map(s => s.url), mode: scraperMode })
                    });
                    const scrapeData = await scrapeResponse.json();
                    scrapedResults = scrapeData.results;
                }
                
                // Attach scraped contents to local sources variables for prompt building
                const webSources = currentSources.map((source, index) => {
                    const scrapedContent = scrapedResults[index] ? scrapedResults[index].content : "Error scraping content.";
                    
                    // Calculate stats
                    const contentLen = scrapedContent.length;
                    if (scraperMode === 'raw') {
                        rawCharacters += contentLen;
                        cleanCharacters += Math.floor(contentLen * 0.15); // simulate that only 15% is actual article
                    } else {
                        cleanCharacters += contentLen;
                        rawCharacters += Math.floor(contentLen * 3.5); // simulate original HTML was 3.5x larger
                    }
                    
                    formattedScrapedTextForInspector += `=== SOURCE [${index + 1}]: ${source.url} ===\n${scrapedContent.substring(0, 1500)}...\n\n`;
                    
                    return {
                        ...source,
                        content: scrapedContent
                    };
                });

                processedSources = [...localSources, ...webSources];

                // Update Scraper node/path state
                if (scraperMode === 'raw') {
                    setNodeState('node-scraper', 'fail', 'HTML Flooded!');
                    setPathState('path-2-3', 'fail');
                    pipelineWarning.classList.remove('hidden');
                    pipelineSuccess.classList.add('hidden');
                } else {
                    setNodeState('node-scraper', 'success', 'Clean Markdown');
                    setPathState('path-2-3', 'success');
                    pipelineWarning.classList.add('hidden');
                    pipelineSuccess.classList.remove('hidden');
                }
            }
            
            // Render all sources (local + web) list in UI
            renderSources(processedSources);
            
            // Update stats labels
            statsRawChars.innerText = `${rawCharacters.toLocaleString()} chars`;
            statsCleanChars.innerText = `${cleanCharacters.toLocaleString()} chars`;
            
            const wasted = Math.max(0, rawCharacters - cleanCharacters);
            const wastedPercent = Math.max(0, Math.floor((wasted / (rawCharacters || 1)) * 100));
            statsWastedChars.innerText = `${wasted.toLocaleString()} chars (${wastedPercent}%)`;
            
            if (focusMode !== 'writing') {
                if (scraperMode === 'raw') {
                    statsWastedChars.className = "status-val red bold";
                } else {
                    statsWastedChars.className = "status-val bold";
                    statsWastedChars.style.color = "var(--color-success)";
                }
            } else {
                statsWastedChars.className = "status-val bold";
                statsWastedChars.innerText = "0 chars (0%)";
            }
            
            debugScrapedContent.innerText = formattedScrapedTextForInspector || "No data scraped.";
            
            // STEP 4: Context formulation
            setNodeState('node-context', 'loading', 'Packaging...');
            setPathState('path-3-4', 'active');
            
            await new Promise(r => setTimeout(r, 600));
            
            // Format system prompt to show in Inspector
            const sysPrompt = (
                "You are a precise search assistant...\n" +
                "Rule 3: You MUST cite the source index in square brackets like [1] or [2]...\n" +
                "Rule 4: Do not hallucinate."
            );
            debugPromptContent.innerText = `SYSTEM PROMPT:\n${sysPrompt}\n\nUSER PROMPT:\nContext Documents: (Attached ${processedSources.length} pages of length ~${cleanCharacters} chars)\nQuery: ${query}`;
            
            setNodeState('node-context', 'success', 'Prompt Ready');
            setPathState('path-3-4', 'success');
            
            // STEP 5: Local LLM
            setNodeState('node-llm', 'loading', 'Generating...');
            setPathState('path-4-5', 'active');
            
            // SSE Answer call
            answerBody.innerHTML = '<span class="cursor-pulse">|</span>';
            
            const response = await fetch('/api/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, sources: processedSources })
            });
            
            if (!response.ok) {
                let errorMsg = `Error ${response.status}: Failed to generate answer from Ollama.`;
                try {
                    const errData = await response.json();
                    if (errData && errData.detail) {
                        errorMsg = errData.detail;
                    }
                } catch (e) {}
                throw new Error(errorMsg);
            }
            
            setNodeState('node-llm', 'success', 'Streaming...');
            setPathState('path-4-5', 'success');
            
            // STEP 6: Output UI
            setNodeState('node-answer', 'loading', 'Rendering...');
            setPathState('path-5-6', 'active');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            accumulatedText = "";
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                // Parse EventStream structure (data: {"text": "..."})
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const rawData = line.substring(6).trim();
                        if (rawData === '[DONE]') {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(rawData);
                            accumulatedText += parsed.text;
                            renderAnswerText(accumulatedText);
                        } catch (e) {
                            // Incomplete JSON chunk
                        }
                    }
                }
            }
            
            // Finish
            setNodeState('node-answer', 'success', 'Complete');
            setPathState('path-5-6', 'success');
            
            // Remove text cursor
            const cursor = answerBody.querySelector('.cursor-pulse');
            if (cursor) cursor.remove();
            
        } catch (error) {
            console.error(error);
            setNodeState('node-llm', 'fail', 'Error');
            setNodeState('node-answer', 'fail', 'Error');
            answerBody.innerHTML = `<div class="status-val red" style="text-align: left;">Error during processing: ${error.message}</div>`;
        } finally {
            submitBtn.disabled = false;
        }
    }

    // Render Sources Cards
    function renderSources(sources) {
        sourcesGrid.innerHTML = "";
        sources.forEach((src, idx) => {
            const index = idx + 1;
            const isLocal = src.url.startsWith('local-file://');
            let domain = "";
            let iconHTML = "";
            
            if (isLocal) {
                domain = "Local Attachment";
                const isPdf = src.url.endsWith('.pdf');
                const iconName = isPdf ? 'file-digit' : 'file-text';
                iconHTML = `<i data-lucide="${iconName}" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; color: var(--color-accent);"></i>`;
            } else {
                try {
                    domain = new URL(src.url).hostname;
                } catch(e) {
                    domain = "Web Source";
                }
                const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                iconHTML = `<img src="${favicon}" width="12" height="12" style="margin-right: 4px; vertical-align: middle; border-radius: 2px;" onerror="this.style.display='none'">`;
            }
            
            const card = document.createElement('a');
            if (isLocal) {
                card.href = "#";
                card.style.cursor = "default";
                card.addEventListener('click', (e) => e.preventDefault());
            } else {
                card.href = src.url;
                card.target = "_blank";
            }
            card.className = "source-card";
            card.id = `source-card-${index}`;
            card.innerHTML = `
                <div class="source-index">${index}</div>
                <div class="source-title">${src.title || 'Untitled Source'}</div>
                <div class="source-url">
                    ${iconHTML}
                    ${domain}
                </div>
            `;
            sourcesGrid.appendChild(card);
        });

        createIconsSafe();
    }



    // Render streamed answer text with basic markdown and citation badges
    function renderAnswerText(text) {
        // 1. Markdown Links: [Link Text](URL) -> <a href="URL" target="_blank" class="external-link">Link Text</a>
        let formatted = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            return `<a href="${url}" target="_blank" class="external-link">${linkText}</a>`;
        });

        // 2. Citations: [1] -> clickable badge
        formatted = formatted.replace(/\[(\d+)\]/g, (match, index) => {
            return `<a href="#" class="citation-badge" data-index="${parseInt(index)}">${index}</a>`;
        });

        // 3. Bold: **text** -> <strong>text</strong>
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 4. Line-by-line parsing for lists and paragraphs
        const lines = formatted.split('\n');
        let htmlOutput = "";
        let currentBlockType = null; // 'ul', 'ol', 'p', or null
        let accumulatedLines = [];

        function flushBlock() {
            if (accumulatedLines.length === 0) return;

            if (currentBlockType === 'ul') {
                htmlOutput += "<ul>" + accumulatedLines.map(line => `<li>${line}</li>`).join('') + "</ul>";
            } else if (currentBlockType === 'ol') {
                htmlOutput += "<ol>" + accumulatedLines.map(line => `<li>${line}</li>`).join('') + "</ol>";
            } else if (currentBlockType === 'p') {
                htmlOutput += "<p>" + accumulatedLines.join('<br>') + "</p>";
            }
            accumulatedLines = [];
            currentBlockType = null;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed === "") {
                flushBlock();
                continue;
            }

            const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
            const olMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);

            if (ulMatch) {
                if (currentBlockType !== 'ul') {
                    flushBlock();
                    currentBlockType = 'ul';
                }
                accumulatedLines.push(ulMatch[1]);
            } else if (olMatch) {
                if (currentBlockType !== 'ol') {
                    flushBlock();
                    currentBlockType = 'ol';
                }
                accumulatedLines.push(olMatch[2]);
            } else {
                if (currentBlockType !== 'p') {
                    flushBlock();
                    currentBlockType = 'p';
                }
                accumulatedLines.push(line);
            }
        }
        flushBlock();

        answerBody.innerHTML = htmlOutput + '<span class="cursor-pulse">|</span>';
    }

    // SVG Connector drawing coordinates mapping
    function drawConnectors() {
        const svg = document.getElementById('flow-connectors');
        if (!svg) return;
        
        // Hide SVG lines on smaller screens where nodes wrap vertically
        if (window.innerWidth < 1200) {
            svg.style.display = 'none';
            return;
        } else {
            svg.style.display = 'block';
        }
        
        const nodes = [
            'node-query',
            'node-search',
            'node-scraper',
            'node-context',
            'node-llm',
            'node-answer'
        ];
        
        const svgRect = svg.getBoundingClientRect();
        
        for (let i = 0; i < nodes.length - 1; i++) {
            const nodeA = document.getElementById(nodes[i]);
            const nodeB = document.getElementById(nodes[i+1]);
            const path = document.getElementById(`path-${i+1}-${i+2}`);
            
            if (nodeA && nodeB && path) {
                const iconA = nodeA.querySelector('.node-icon');
                const iconB = nodeB.querySelector('.node-icon');
                
                const rectA = iconA.getBoundingClientRect();
                const rectB = iconB.getBoundingClientRect();
                
                // Calculate centers relative to the SVG container
                const x1 = rectA.right - svgRect.left;
                const y1 = rectA.top + (rectA.height / 2) - svgRect.top;
                
                const x2 = rectB.left - svgRect.left;
                const y2 = rectB.top + (rectB.height / 2) - svgRect.top;
                
                // Simple straight line with offset curve
                path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
            }
        }
    }
});

// Cursor animation style injected
const style = document.createElement('style');
style.innerHTML = `
@keyframes cursor-blink {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
}
.cursor-pulse {
    animation: cursor-blink 0.8s infinite;
    color: var(--color-success);
    font-weight: bold;
    margin-left: 2px;
}
`;
document.head.appendChild(style);
