/**
 * tcantbenormal.github.io - Main Interactive Script
 * Author: Muhammad Taimoor Ashfaq Malik
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initProjectFilters();
});

/* ==========================================================================
   1. Navbar Scroll Behavior & ScrollSpy
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');
  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('nav-links');

  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.forEach(l => l.addEventListener('click', () => menu.classList.remove('open')));

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   2. Project Filter Tabs Logic
   ========================================================================== */
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.filter-tab');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const categories = card.getAttribute('data-category');
        if (filter === 'all' || categories.includes(filter)) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
        }
      });
    });
  });
}

/* ==========================================================================
   3. Project Modal Data & Handler
   ========================================================================== */
const projectData = {
  'aqua-assist': {
    title: 'AquaAssist: GeoAI Spatial Decision Support System',
    category: 'GeoAI & Spatial Decision Support',
    img: 'assets/images/aqua_assist_sdss.jpg',
    github: 'https://github.com/tcantbenormal',
    bullets: [
      'Architected an agentic SDSS with a dual-pipeline framework evaluating Rainwater Harvesting (RWH) suitability across administrative boundaries.',
      'Extracted hydrological parameters (slope, flow accumulation, drainage density) directly from DEMs and multispectral rasters.',
      'Engineered Fuzzy Analytical Hierarchy Process (FAHP) combined with offline local LLMs (Ollama / LangChain) to autonomously adjust spatial weights.',
      'Delivered Explainable GeoAI justifications alongside Streamlit, PyQt, and interactive Folium geospatial visualizations.'
    ],
    tech: ['Python', 'LangChain', 'Ollama LLM', 'FAHP', 'GDAL', 'Streamlit', 'Folium', 'PyQt', 'TiTiler', 'FastAPI']
  },
  'ship-detection': {
    title: 'ArcGIS Pro Add-In for AI Ship Detection',
    category: 'ArcGIS Pro SDK & Computer Vision',
    img: 'assets/images/arcgis_ship_detection.png',
    github: 'https://github.com/tcantbenormal',
    bullets: [
      'Engineered a custom ArcGIS Pro Add-In automating maritime vessel detection across Synthetic Aperture Radar (SAR) and optical satellite imagery.',
      'Integrated a custom-trained YOLOv5 neural network directly into the ArcGIS geoprocessing pipeline.',
      'Wrote custom C# & ArcPy Python wrappers for raw SAR data normalization, bounding box coordinate translation, and Non-Maximum Suppression (NMS).',
      'Chained model inference with geodesic area filtering and automated spatial feature class outputs.'
    ],
    tech: ['ArcGIS Pro SDK', 'C# / .NET 8', 'PyTorch', 'YOLOv5', 'SAR Satellite Data', 'ArcPy']
  },
  'ahp-analyzer': {
    title: 'AHP / FAHP Spatial Analyzer Add-in for ArcGIS Pro',
    category: 'ArcGIS Pro SDK & Spatial MCDA',
    img: 'assets/images/ahp_fahp_analyzer.png',
    github: 'https://github.com/tcantbenormal/Ahp-Fahp-Analyzer-For-ArcGIS-Pro',
    bullets: [
      'Developed a professional C#/.NET 8.0 SDK Add-in for ArcGIS Pro simplifying Multi-Criteria Decision Analysis (MCDA).',
      'Features real-time Consistency Ratio (CR) validation alerts for pairwise matrix entry.',
      'Automated raster overlay calculation via ArcPy integration.',
      'Built a Monte Carlo Sensitivity Analysis module simulating thousands of weight variations.'
    ],
    tech: ['C#', '.NET 8.0 SDK', 'ArcGIS Pro SDK', 'ArcPy', 'Monte Carlo Simulation', 'MCDA']
  },
  'rusle-tarbela': {
    title: 'RUSLE Soil Erosion & Tarbela Reservoir Sedimentation',
    category: 'Remote Sensing & Hydrology',
    img: 'assets/images/tarbela_studyarea.png',
    github: 'https://link.springer.com/article/10.1007/s41742-025-01017-w',
    bullets: [
      'Designed a Python-based GIS tool modeling soil erosion and sedimentation trends in the Tarbela Reservoir over three decades using RUSLE.',
      'Integrated satellite imagery (Landsat/Sentinel), climate datasets, and soil property rasters.',
      'Revealed a 65% reduction in reservoir storage capacity due to sediment deposition.',
      'Published in Springer Nature International Journal of Environmental Research (2026).'
    ],
    tech: ['RUSLE', 'Python', 'Landsat 8/9', 'Sentinel-2', 'Hydrological Modeling', 'Springer Nature']
  },
  'rwh-kpk': {
    title: 'Rainwater Harvesting Hotspot Zonation (KPK)',
    category: 'Google Earth Engine & Spatial MCDA',
    img: '',
    github: 'https://github.com/tcantbenormal',
    bullets: [
      'Developed a spatial framework identifying optimal rainwater harvesting zones in Khyber Pakhtunkhwa to mitigate water scarcity.',
      'Utilized Google Earth Engine (GEE), ArcGIS Pro, and QGIS for multi-criteria dataset integration.',
      'Applied Fuzzy AHP ranking based on topography, soil, rainfall, and aridity indices.'
    ],
    tech: ['Google Earth Engine', 'FAHP', 'QGIS', 'ArcGIS Pro', 'Hydrology']
  },
  'salinity-chakwal': {
    title: 'Salt-Affected Soil Spectral Mapping (Chakwal)',
    category: 'Remote Sensing & Spectral Indices',
    img: 'assets/images/sas_studyarea.png',
    github: 'https://github.com/tcantbenormal',
    bullets: [
      'Mapped salt-affected soils in Chakwal district using satellite spectral indices (NDSI, NDVI, VSSI, SI1–SI4).',
      'Evaluated seasonal effectiveness of vegetation and salinity indices across Landsat 8/9 & Sentinel-2 imagery.',
      'Classified land into low (15,222 ha), moderate (112 ha), and high (209 ha) salinity zonation maps.'
    ],
    tech: ['Sentinel-2', 'Landsat 8/9', 'ArcGIS Pro', 'Spectral Indices', 'Soil Zonation'],
    pptx: 'assets/docs/FINAL_PRESENTATION_NRM.pptx'
  },
  'nsdi-roads': {
    title: 'Pakistan NSDI Road Network Digitization',
    category: 'Spatial Data Infrastructures',
    img: 'assets/images/nsdi_studyarea.png',
    github: 'https://github.com/tcantbenormal',
    report: 'assets/docs/Pakistan_SDI_Report.docx',
    pptx: 'assets/docs/Pakistan_SDI.pptx',
    bullets: [
      'Developed a refined road network dataset as a foundational component of Pakistan’s National Spatial Data Infrastructure (NSDI).',
      'Resolved road fragmentation, metadata gaps, and misaligned geometries through rigorous topology validation rules.',
      'Enhanced data-sharing capabilities for national infrastructure planning.'
    ],
    tech: ['PostGIS', 'NSDI Standards', 'Topology Checks', 'QGIS', 'Spatial Quality Assurance']
  },
  'glof-shishper': {
    title: 'GLOF Disaster Assessment: Shishper Glacier',
    category: 'Disaster Risk & Multi-Sensor RS',
    img: 'assets/images/shishper_glacier_studyarea.png',
    github: 'https://github.com/tcantbenormal',
    report: 'assets/docs/final_report_RSG-609.docx',
    bullets: [
      'Analyzed the 2022 Shishper Glacier outburst flood event using Landsat-8/9, Sentinel-2, MODIS, and ALOS PALSAR radar data.',
      'Mapped thermal and debris changes identifying rapid glacier melt triggers.',
      'Quantified post-flood infrastructure damage to formulate early warning strategies.'
    ],
    tech: ['ALOS PALSAR Radar', 'Thermal Remote Sensing', 'GLOF', 'Disaster Assessment']
  },
  'shp-kml': {
    title: 'Shapefile to KML Standalone Converter Desktop App',
    category: 'Desktop GUI Utilities',
    img: '',
    github: 'https://github.com/tcantbenormal',
    bullets: [
      'Developed a Python desktop application converting ZIP shapefiles directly to reprojected WGS84 KML format for Google Earth.',
      'Built a user-friendly Tkinter GUI with coordinate transformation via PyProj and error handling.',
      'Packaged into a standalone executable using PyInstaller for hassle-free distribution.'
    ],
    tech: ['Python Tkinter', 'PyProj', 'SimpleKML', 'PyInstaller', 'Geospatial Converter']
  },
  'ngcp-infrastructure': {
    title: 'Digitization of NGCP Infrastructure Data & Disaster Risk Analysis',
    category: 'Spatial Analysis & Disaster Risk',
    img: 'assets/images/ngcp_cyclones.png',
    github: '#',
    bullets: [
      'Digitized nationwide energy infrastructure spatial data for the National Disaster Risk Management Fund (NDRMF).',
      'Conducted extensive multi-hazard disaster risk assessments, analyzing infrastructure vulnerability against cyclones and floods.',
      'Produced comprehensive analytical reports to guide climate-resilient infrastructure investments.'
    ],
    tech: ['Disaster Risk Analysis', 'Spatial Digitization', 'Infrastructure Vulnerability', 'QGIS / ArcGIS'],
    pptx: 'assets/docs/Digitization_of_NGCP_Infrastructure_Data.pptx',
    report: 'assets/docs/Energy_Sector_Report.docx'
  }
};

function openProjectModal(key) {
  const data = projectData[key];
  if (!data) return;

  const modal = document.getElementById('project-modal');
  const container = document.getElementById('modal-content');

  const imageHtml = data.img ? `<img class="modal-img" src="${data.img}" alt="${data.title}">` : '';

  const slideshowHtml = data.pptx ? `
    <h4 class="modal-sub">Project Presentation</h4>
    <div class="modal-embed">
      <iframe src="https://view.officeapps.live.com/op/embed.aspx?src=https://tcantbenormal.github.io/${data.pptx}" loading="lazy" title="${data.title} slides"></iframe>
    </div>
    <div class="modal-embed-note">Embedded via Office viewer. <a href="${data.pptx}">Download PPTX</a></div>
  ` : '';

  const bulletsHtml = data.bullets.map(b => `<li>${b}</li>`).join('');
  const techHtml = data.tech.map(t => `<span class="project-tag">${t}</span>`).join('');

  container.innerHTML = `
    <span class="section-tag">${data.category}</span>
    <h2 class="modal-h">${data.title}</h2>
    ${imageHtml}
    ${slideshowHtml}
    <h4 class="modal-sub">Key Engineering Highlights</h4>
    <ul class="modal-list">${bulletsHtml}</ul>
    <div class="modal-tags">${techHtml}</div>
    <div class="modal-actions">
      ${data.report ? `<a href="${data.report}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-file-word"></i> Read Report</a>` : ''}
      ${data.github && data.github !== '#' ? `<a href="${data.github}" target="_blank" class="btn btn-primary btn-sm"><i class="fa-brands fa-github"></i> Open Code / Repository</a>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="closeProjectModal()">Close</button>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProjectModal(); });

/* Close modal when clicking background overlay */
document.getElementById('project-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'project-modal') {
    closeProjectModal();
  }
});

/* ==========================================================================
   4. Copy Email Toast Notification
   ========================================================================== */
function copyContactEmail() {
  const email = 'malik.taimoor2001@gmail.com';
  navigator.clipboard.writeText(email).then(() => {
    showToast('Copied malik.taimoor2001@gmail.com to clipboard!');
  }).catch(() => {
    showToast('Email: malik.taimoor2001@gmail.com');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
