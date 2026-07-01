---
layout: archive
title: "Zhaorong's CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

Education
======
* Ph.D in Bioinformatics, Boston University, 2026
* M.S. in Bioinformatics, Boston University, 2019
* B.S. in Applied Mathematics, Stony Brook University, 2018
* B.S. in Biology, Stony Brook University, 2018

Work experience
======
* August 2019 - Present: Bioinformatic Scientist
  * Harvard Medical School

* August 2022 - April 2023: Bioinformatics Co-op
  * Merck

* January 2019 - August 2020: Research Assistant
  * Boston University

* August 2018 - January 2019: Research Assistant
  * Koch Institute
  
Skills
======
* Programming Language:
  * Java
  * C
  * Python
  * R
  * Perl
  * SQL
* Pipeline system
  * Snakemake
  * Nextflow
* Bioinformatics analysis
  * Spatial Transcriptome analysis
    * Cell segmentation calling
    * Clustering and Cell type annotation
    * NICHE detection
    * Intercellular ligand-receptor communication
  * Single cell Transcriptome
    * Alignment and quantification
    * Clustering and Cell type annotation
    * Trajectory analysis (Pseudo-time and RNA velocity)
    * Intercellular ligand-receptor communication
    * Cell Atlas Construction
  * Bulk RNA-Seq
    * Alignment and Quantification
    * Differential expression analysis
    * WGCNA
    * Biomarker signature extractions
    * Virus detection and viral gene expression quantification
  * Epigenetic Data (ATAC/ChIP-Seq/CUT&RUN)
    * Alignment, QC and Peak calling
    * Differential accessibility/methylation/acetylation analysis
  * Multi-ome data integration and analysis
    * Integration transcriptome and epigeome data

Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>



<!-- Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
  
Talks
======
  <ul>{% for post in site.talks reversed %}
    {% include archive-single-talk-cv.html  %}
  {% endfor %}</ul>
  
Teaching
======
  <ul>{% for post in site.teaching reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
  
Service and leadership
======
* Currently signed in to 43 different slack teams
-->

