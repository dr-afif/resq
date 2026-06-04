document.addEventListener('DOMContentLoaded', () => {
  // --- Tab Switching Logic ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');

      // Update active tab buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update active content sections
      tabContents.forEach(content => {
        if (content.id === targetId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  // --- Contacts Directory System ---
  const contactsData = [
    { name: 'Red Zone (Resus 1)', extension: '9591', category: 'Emergency Zones' },
    { name: 'Red Zone (Resus 2)', extension: '9592', category: 'Emergency Zones' },
    { name: 'Yellow Zone (A)', extension: '9589', category: 'Emergency Zones' },
    { name: 'Yellow Zone (B)', extension: '9590', category: 'Emergency Zones' },
    { name: 'Green Zone (Consultation 1)', extension: '9584', category: 'Emergency Zones' },
    { name: 'Green Zone (Consultation 2)', extension: '9585', category: 'Emergency Zones' },
    { name: 'Triage (Counter)', extension: '9850', category: 'Emergency Zones' },
    { name: 'Triage (Primary)', extension: '9595', category: 'Emergency Zones' },
    { name: 'Triage (Secondary)', extension: '9582', category: 'Emergency Zones' },
    { name: 'PAU', extension: '9302', category: 'Emergency Zones' },
    { name: 'Pathology Lab', extension: '9143 / 9144 / 9145 / 9147 / 9149', category: 'Labs & Diagnostics' },
    { name: 'Microbiology Lab', extension: '9111 / 9113 / 9131', category: 'Labs & Diagnostics' },
    { name: 'Radiology (Counter)', extension: '9353', category: 'Labs & Diagnostics' },
    { name: 'Radiology (Oncall)', extension: '018-2515803', category: 'Labs & Diagnostics' },
    { name: 'Radiology (MRI Suite)', extension: '9560', category: 'Labs & Diagnostics' },
    { name: 'Radiology (CT Suite)', extension: '9540', category: 'Labs & Diagnostics' },
    { name: 'Admission Counter (PTPO 1)', extension: '9618', category: 'Support & Services' },
    { name: 'Admission Counter (PTPO 2)', extension: '9609', category: 'Support & Services' },
    { name: 'Pharmacy (Outpatient)', extension: '9663 / 9664 / 9669', category: 'Support & Services' },
    { name: 'Pharmacy (Inpatient)', extension: '9671 / 9672', category: 'Support & Services' }
  ];

  const contactsList = document.getElementById('contacts-list');
  const searchInput = document.getElementById('contact-search');

  function renderContacts(filter = '') {
    if (!contactsList) return;
    contactsList.innerHTML = '';

    const query = filter.toLowerCase().trim();
    const filtered = contactsData.filter(contact => 
      contact.name.toLowerCase().includes(query) || 
      contact.extension.includes(query) ||
      contact.category.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      contactsList.innerHTML = `
        <div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p>No contacts found matching "${filter}"</p>
        </div>
      `;
      return;
    }

    // Group by category
    const categories = [...new Set(filtered.map(item => item.category))];

    categories.forEach(cat => {
      const catGroup = document.createElement('div');
      catGroup.className = 'contact-category-group';
      
      const catTitle = document.createElement('h3');
      catTitle.textContent = cat;
      catGroup.appendChild(catTitle);

      const listContainer = document.createElement('div');
      listContainer.className = 'contacts-inner-list';

      filtered.filter(item => item.category === cat).forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item-card';
        item.innerHTML = `
          <div class="contact-info">
            <span class="contact-name">${contact.name}</span>
            <span class="contact-category">${contact.category}</span>
          </div>
          <a href="tel:${contact.extension}" class="contact-extension">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${contact.extension}
          </a>
        `;
        listContainer.appendChild(item);
      });

      catGroup.appendChild(listContainer);
      contactsList.appendChild(catGroup);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderContacts(e.target.value);
    });
  }

  // Initial Contacts Render
  renderContacts();

  // --- Common Websites System ---
  const websitesData = [
    {
      name: 'Radiology / PACS',
      description: 'For imaging done before 2025',
      url: 'https://pacs.hp.upm.edu.my',
      username: 'radiology',
      password: 'hpupm123',
      category: 'Diagnostics'
    },
    {
      name: 'Radiology / PACS',
      description: 'For imaging done after 2025',
      url: 'https://10.150.236.205/zfp',
      username: 'hisupport',
      password: 'Hsaas@1234',
      category: 'Diagnostics'
    }
  ];

  const websitesList = document.getElementById('websites-list');
  const websiteSearchInput = document.getElementById('website-search');

  function renderWebsites(filter = '') {
    if (!websitesList) return;
    websitesList.innerHTML = '';

    const query = filter.toLowerCase().trim();
    const filtered = websitesData.filter(site =>
      site.name.toLowerCase().includes(query) ||
      site.description.toLowerCase().includes(query) ||
      site.category.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      websitesList.innerHTML = `
        <div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p>No websites found matching "${filter}"</p>
        </div>
      `;
      return;
    }

    filtered.forEach(site => {
      const card = document.createElement('div');
      card.className = 'website-card';
      card.innerHTML = `
        <div class="website-card-header">
          <div>
            <span class="website-category">${site.category}</span>
            <h3>${site.name}</h3>
          </div>
          ${site.url ? `<a class="website-open-link" href="${site.url}" target="_blank" rel="noopener">Open</a>` : '<span class="website-open-link disabled">URL not set</span>'}
        </div>
        <p>${site.description}</p>
        <div class="credential-grid">
          <div class="credential-row">
            <span>Username</span>
            <strong>${site.username}</strong>
            <button type="button" class="copy-credential-btn" data-copy-value="${site.username}">Copy</button>
          </div>
          <div class="credential-row">
            <span>Password</span>
            <strong>${site.password}</strong>
            <button type="button" class="copy-credential-btn" data-copy-value="${site.password}">Copy</button>
          </div>
        </div>
      `;
      websitesList.appendChild(card);
    });
  }

  if (websiteSearchInput) {
    websiteSearchInput.addEventListener('input', (e) => {
      renderWebsites(e.target.value);
    });
  }

  if (websitesList) {
    websitesList.addEventListener('click', (e) => {
      const copyButton = e.target.closest('.copy-credential-btn');
      if (!copyButton) return;

      const value = copyButton.getAttribute('data-copy-value') || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(() => {
          copyButton.textContent = 'Copied';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 1500);
        }).catch(() => {
          prompt('Copy this value:', value);
        });
      } else {
        prompt('Copy this value:', value);
      }
    });
  }

  renderWebsites();

  // --- Accordion FAQ Logic ---
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    trigger.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Collapse all FAQ items
      faqItems.forEach(faq => faq.classList.remove('active'));

      // If it wasn't active, expand it
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
});
