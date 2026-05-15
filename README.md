# SOC Assistant

SOC Assistant est une plateforme d’aide à l’analyse SOC qui combine **Elastic Security**, **RAG**, **MITRE ATT&CK** et **Groq** pour accélérer la qualification des alertes, proposer des playbooks adaptés et générer des rapports exploitables par un analyste.

## Aperçu

Le projet centralise un flux de travail orienté sécurité opérationnelle:

- ingestion et consultation d’alertes Elastic Security;
- analyse assistée par IA pour résumer et contextualiser une alerte;
- recherche de playbooks pertinents via vector search et RAG;
- clustering des alertes pour détecter des comportements similaires;
- génération de rapports et de synthèses exécutives;
- interface web React pour visualiser les alertes, timelines, clusters et recommandations.

## Pourquoi ce projet est intéressant pour un CV

Ce projet montre une capacité à concevoir une solution complète, du backend à l’interface, avec des briques modernes de cybersécurité et d’IA. Il met en avant:

- l’intégration d’un SIEM et d’un moteur de recherche vectoriel;
- l’orchestration d’un pipeline IA pour l’analyse d’incidents;
- la structuration de playbooks de réponse à incident;
- la création d’une interface utilisateur claire pour les opérations SOC;
- la gestion propre des variables d’environnement et des secrets.

## Fonctionnalités principales

- Authentification basée sur Elastic.
- Tableau de bord d’alertes avec filtres et détail d’incident.
- Analyse automatique d’alertes avec contexte MITRE ATT&CK.
- Playbooks de réponse stockés en YAML.
- Moteur RAG pour retrouver le playbook le plus pertinent.
- Clustering des alertes pour regrouper des incidents similaires.
- Génération de rapports pour support opérationnel ou direction.
- Chatbot SOC pour explorer les alertes et guider l’analyste.

## Architecture

- `backend/`: API FastAPI, logique d’analyse, intégrations Elastic et Groq, modules RAG et génération de rapports.
- `frontend/`: application React/Vite pour l’interface analyste.
- `backend/playbooks/yaml/`: base de playbooks sécurité en YAML.
- `backend/reports_output/`: sortie des rapports générés localement.

## Stack technique

- Backend: Python, FastAPI, Pydantic, Elasticsearch, Groq, RAG.
- Frontend: React, Vite, Tailwind CSS, Axios, Recharts.
- Sécurité et ops: variables d’environnement, JWT, intégration SIEM.

## Installation

### 1. Pré-requis

- Python 3.10+.
- Node.js 18+.
- Un cluster Elasticsearch accessible.
- Une clé API Groq.

### 2. Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Copiez ensuite le fichier d’exemple:

```bash
copy .env.example .env
```

Renseignez les valeurs réelles dans `.env`, puis lancez l’API:

```bash
python backend/main.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variables d’environnement

Les secrets ne doivent jamais être commités. Utilisez `.env.example` comme base, puis créez votre `.env` local.

Variables importantes:

- `ELASTIC_URL`
- `ELASTIC_USER`
- `ELASTIC_PASSWORD`
- `ELASTIC_CA_CERT`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `VITE_API_BASE_URL` côté frontend si vous déployez l’API ailleurs que `localhost`

## Résumé prêt pour GitHub / CV

Vous pouvez réutiliser cette description courte dans votre profil GitHub ou votre CV:

> SOC Assistant is an AI-powered SOC platform that combines Elastic Security, RAG, MITRE ATT&CK mapping, and Groq LLMs to help analysts triage alerts, retrieve relevant playbooks, generate incident reports, and visualize security operations through a modern web interface.

Version plus courte pour CV:

> Développement d’une plateforme SOC assistée par IA pour l’analyse d’alertes Elastic, la recommandation de playbooks et la génération automatique de rapports.

## Sécurité

- Ne poussez jamais `.env` sur GitHub.
- Utilisez `.env.example` pour documenter les variables.
- Si une clé a déjà été exposée, régénérez-la immédiatement.

## Améliorations possibles

- Ajouter des captures d’écran du dashboard.
- Déployer le frontend sur Vercel ou Netlify.
- Déployer le backend sur un serveur dédié ou un container.
- Ajouter des tests automatisés et un pipeline CI/CD.
