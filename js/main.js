/**
 * tcantbenormal.github.io - Main Interactive Script
 * Author: Muhammad Taimoor Ashfaq Malik
 */

document.addEventListener('DOMContentLoaded', () => {
  initGeoCanvas();
  initNavbar();
  initProjectFilters();
});

/* ==========================================================================
   1. Interactive HTML5 Geospatial Coordinate Canvas
   ========================================================================== */
function initGeoCanvas() {
  const canvas = document.getElementById('geo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const nodeCount = Math.floor((width * height) / 22000);
  const nodes = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw connecting lines
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16, 185, 129, ${node.alpha})`;
      ctx.fill();

      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    });

    requestAnimationFrame(draw);
  }

  draw();
}

/* ==========================================================================
   2. Navbar Scroll Behavior & ScrollSpy
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

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
   3. Project Filter Tabs Logic
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
   4. Project Modal Data & Handler
   ========================================================================== */
const projectData = {
  'aqua-assist': {
    title: 'AquaAssist: GeoAI Spatial Decision Support System',
    category: 'GeoAI & Spatial Decision Support',
    img: 'assets/images/aqua_assist_sdss.png',
    github: 'https://github.com/tcantbenormal',
    bullets: [
      'Architected an agentic SDSS with a dual-pipeline framework evaluating Rainwater Harvesting (RWH) suitability across administrative boundaries.',
      'Extracted hydrological parameters (slope, flow accumulation, drainage density) directly from DEMs and multispectral rasters.',
      'Engineered Fuzzy Analytical Hierarchy Process (FAHP) combined with offline local LLMs (Ollama / LangChain) to autonomously adjust spatial weights.',
      'Delivered Explainable GeoAI justifications alongside Streamlit, PyQt, and interactive Folium geospatial visualizations.'
    ],
    tech: ['Python', 'LangChain', 'Ollama LLM', 'FAHP', 'GDAL', 'Streamlit', 'Folium', 'PyQt']
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
    slideshow: 'https://view.officeapps.live.com/op/embed.aspx?src=https://tcantbenormal.github.io/assets/docs/FINAL_PRESENTATION_NRM.pptx'
  },
  'nsdi-roads': {
    title: 'Pakistan NSDI Road Network Digitization',
    category: 'Spatial Data Infrastructures',
    img: '',
    github: 'https://github.com/tcantbenormal',
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
    slideshow: 'https://view.officeapps.live.com/op/embed.aspx?src=https://tcantbenormal.github.io/assets/docs/Digitization_of_NGCP_Infrastructure_Data.pptx',
    report: 'assets/docs/Energy_Sector_Report.docx'
  }
};

function openProjectModal(key) {
  const data = projectData[key];
  if (!data) return;

  const modal = document.getElementById('project-modal');
  const container = document.getElementById('modal-content');

  let imageHtml = data.img ? `<img src="${data.img}" alt="${data.title}" style="width:100%; max-height:280px; object-fit:cover; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-light);">` : '';
  
  let slideshowHtml = data.slideshow ? `
    <h4 style="font-size:1rem; font-weight:700; margin-bottom:0.5rem; color:var(--accent-emerald);">Project Presentation:</h4>
    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-bottom: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
      <iframe src="${data.slideshow}" width="100%" height="100%" frameborder="0" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
    </div>
    <div style="font-size:0.8rem; color:var(--text-sub); margin-bottom:1.5rem; margin-top:-1rem;">* Slideshow will load once the site is live on GitHub Pages. <a href="assets/docs/FINAL_PRESENTATION_NRM.pptx" style="color:var(--accent-emerald); text-decoration:underline;">Download PPTX</a></div>
  ` : '';

  let bulletsHtml = data.bullets.map(b => `<li style="margin-bottom:0.5rem;">${b}</li>`).join('');
  let techHtml = data.tech.map(t => `<span class="project-tag" style="background:rgba(16,185,129,0.1); color:var(--accent-emerald); border:1px solid rgba(16,185,129,0.3); font-size:0.8rem; padding:0.25rem 0.6rem;">${t}</span>`).join('');

  container.innerHTML = `
    <span class="section-tag" style="margin-bottom:0.5rem;">${data.category}</span>
    <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:1rem;">${data.title}</h2>
    ${imageHtml}
    ${slideshowHtml}
    <h4 style="font-size:1rem; font-weight:700; margin-bottom:0.5rem; color:var(--accent-emerald);">Key Engineering Highlights:</h4>
    <ul style="padding-left:1.2rem; font-size:0.9rem; color:var(--text-sub); margin-bottom:1.5rem;">
      ${bulletsHtml}
    </ul>
    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem;">
      ${techHtml}
    </div>
    <div style="display:flex; gap:1rem; border-top:1px solid var(--border-light); padding-top:1.25rem;">
      ${data.report ? `<a href="${data.report}" target="_blank" class="btn btn-secondary" style="padding:0.6rem 1.2rem; font-size:0.875rem;"><i class="fa-solid fa-file-word"></i> Read Report</a>` : ''}
      ${data.github && data.github !== '#' ? `<a href="${data.github}" target="_blank" class="btn btn-primary" style="padding:0.6rem 1.2rem; font-size:0.875rem;"><i class="fa-brands fa-github"></i> Open Code / Repository</a>` : ''}
      <button class="btn btn-secondary" onclick="closeProjectModal()" style="padding:0.6rem 1.2rem; font-size:0.875rem;">
        Close Window
      </button>
    </div>
  `;

  modal.classList.add('active');
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  modal.classList.remove('active');
}

/* Close modal when clicking background overlay */
document.getElementById('project-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'project-modal') {
    closeProjectModal();
  }
});

/* ==========================================================================
   5. Copy Email Toast Notification
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
