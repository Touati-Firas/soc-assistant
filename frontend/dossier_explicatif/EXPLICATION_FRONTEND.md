# Dossier d'explication complete du frontend

Ce document explique en detail le code des fichiers demandes:
- src/App.jsx
- src/api.js
- src/index.css
- src/main.jsx
- index.html
- package.json
- package-lock.json
- postcss.config.js
- tailwind.config.js
- vite.config.js

Note importante sur package-lock.json:
- Ce fichier est genere automatiquement par npm.
- Il peut contenir des milliers de lignes.
- Le schema de chaque bloc est repetitif. Donc je detaille les lignes d'entete et le format exact de chaque bloc de dependance, ce qui couvre litteralement son fonctionnement.

---

## 1) Fichier src/App.jsx

### Role general
Ce composant est la structure principale de l'application React. Il affiche:
- une barre laterale
- une zone principale
- les routes de navigation

### Explication ligne par ligne
1. import { useState } from 'react'
- Importe le hook React useState pour gerer un etat local.

2. import { Routes, Route } from 'react-router-dom'
- Importe le systeme de routage cote client.
- Routes sert de conteneur de routes.
- Route definit chaque chemin URL.

3 a 9. imports des composants UI
- Sidebar: menu lateral.
- AlertDashboard: vue principale des alertes.
- PlaybookChecklist: checklist de playbook.
- IncidentTimeline: chronologie des incidents.
- ClusterView: vue clustering.
- MITREHeatmap: matrice MITRE.
- SOCChatbot: chatbot SOC.

11. export default function App() {
- Declare le composant principal exporte par defaut.

12. const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
- Etat booleen local.
- false = sidebar ouverte au chargement.
- setSidebarCollapsed permet de basculer l'etat.

14. return (
- Debut du rendu JSX.

15. <div className="flex h-screen overflow-hidden bg-gray-950">
- Conteneur global en flex.
- h-screen: hauteur 100vh.
- overflow-hidden: empeche les debordements globaux.
- bg-gray-950: fond tres sombre.

16 a 19. composant Sidebar
- collapsed={sidebarCollapsed}: passe l'etat actuel.
- onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}:
  - inverse l'etat au clic.
  - ouvre/ferme la sidebar.

20 a 24. balise main
- flex-1: prend tout l'espace horizontal restant.
- overflow-auto: scroll interne si contenu long.
- transition-all duration-300: animation fluide 300ms.
- classe conditionnelle:
  - ml-16 si sidebar reduite
  - ml-64 si sidebar ouverte
- Le decalage compense la largeur visuelle de la sidebar.

25. <div className="p-6">
- Conteneur interne avec padding uniforme.

26. <Routes>
- Debut de la definition des routes frontend.

27. <Route path="/" element={<AlertDashboard />} />
- Route racine vers le dashboard d'alertes.

28. <Route path="/playbooks" element={<PlaybookChecklist />} />
- Route vers les playbooks.

29. <Route path="/timeline" element={<IncidentTimeline />} />
- Route vers la timeline.

30. <Route path="/clusters" element={<ClusterView />} />
- Route vers la vue clusters.

31. <Route path="/mitre" element={<MITREHeatmap />} />
- Route vers la heatmap MITRE.

32. <Route path="/chat" element={<SOCChatbot />} />
- Route vers le chatbot SOC.

33 a 38.
- Fermetures successives de Routes, div, main, div global, return et fonction.

---

## 2) Fichier src/api.js

### Role general
Ce fichier centralise tous les appels HTTP vers le backend avec axios.

### Explication ligne par ligne
1. import axios from 'axios'
- Charge la librairie HTTP axios.

3. const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api'
- Lit la variable d'environnement VITE_API_BASE_URL.
- Si absente, utilise l'URL locale de secours.

5 a 11. creation du client axios
- baseURL: prefixe commun de toutes les routes API.
- timeout: 30000 ms.
- Content-Type JSON par defaut.

13. commentaire Alerts
- Separe logiquement la section alertes.

14 a 15. fetchAlerts
- Prend des parametres optionnels.
- GET /alerts avec query params.
- Retourne directement r.data.

17 a 18. fetchAlertById
- GET /alerts/{id}.
- encodeURIComponent protege l'ID dans l'URL.

20 a 21. fetchAlertStats
- GET /alerts/stats.
- Envoie time_range en parametre query.

23. commentaire Analysis
- Debut section analyse.

24 a 25. analyzeAlert
- POST /analyze/{id}.
- Declenche une analyse cote backend.

27 a 28. chatWithSOC
- POST /chat.
- Envoie un payload JSON: message et context.

30. commentaire Playbooks
- Debut section playbooks.

31 a 32. fetchPlaybooks
- GET /playbooks.

34 a 35. matchPlaybook
- GET /playbook/match/{alertId}.
- Recupere le playbook correspondant a une alerte.

37 a 38. togglePlaybookStep
- PUT /playbook/{alertId}/step/{stepId}.
- Met a jour l'etat d'une etape.

40. commentaire Timeline
- Debut section timeline.

41 a 42. fetchTimelineByHost
- GET /timeline/host/{hostname}.
- Ajoute time_range dans les query params.

44 a 45. fetchTimelineByIp
- GET /timeline/ip/{sourceIp}.
- Ajoute time_range.

47 a 48. fetchTimelineByAlert
- GET /timeline/alert/{alertId}.
- Ajoute time_range.

50. commentaire Clusters
- Debut section clustering.

51 a 52. fetchClusters
- GET /clusters avec params optionnels.

54. commentaire Reports
- Debut section generation de rapport.

55 a 63. downloadReport
- GET /report/weekly en mode blob.
- Cree un objet URL temporaire depuis le blob.
- Cree un element a pour telecharger.
- Definit un nom de fichier date en .pdf.
- Declenche link.click().
- Libere l'URL temporaire avec revokeObjectURL.

65. export default api
- Exporte aussi l'instance axios pour usages specifiques.

---

## 3) Fichier src/main.jsx

### Role general
Point d'entree React. Monte l'application dans le DOM.

### Explication ligne par ligne
1. import React from 'react'
- Importe l'objet React.

2. import ReactDOM from 'react-dom/client'
- Importe l'API createRoot (React 18+).

3. import { BrowserRouter } from 'react-router-dom'
- Active le routage HTML5 cote navigateur.

4. import App from './App'
- Importe le composant racine.

5. import './index.css'
- Charge les styles globaux.

7. ReactDOM.createRoot(document.getElementById('root')).render(
- Cible la div root dans index.html.
- Cree la racine React puis lance render.

8 a 12.
- StrictMode active des verifications en dev.
- BrowserRouter encapsule App pour utiliser les routes.
- App est le composant principal affiche.

---

## 4) Fichier src/index.css

### Role general
Styles globaux + classes utilitaires metier avec Tailwind et CSS custom.

### Explication ligne par ligne
1. @tailwind base;
- Injecte les styles de base Tailwind.

2. @tailwind components;
- Injecte les classes composant Tailwind.

3. @tailwind utilities;
- Injecte toutes les utilitaires Tailwind.

5. commentaire Global Styles
- Debut section reset.

6 a 10. selecteur *
- margin: 0 reset.
- padding: 0 reset.
- box-sizing: border-box pour calcul previsible.

12 a 17. body
- police Inter puis fallbacks systeme.
- fond sombre.
- couleur de texte claire.
- lissage police webkit.

19. commentaire Scrollbar
- Debut personnalisation scrollbars webkit.

20 a 23. ::-webkit-scrollbar
- largeur/hauteur de scrollbar = 6px.

25 a 27. ::-webkit-scrollbar-track
- piste de scrollbar en bleu gris sombre.

29 a 32. ::-webkit-scrollbar-thumb
- curseur en gris bleute + arrondi.

34 a 36. hover du thumb
- eclaircit la couleur au survol.

38. commentaire Severity Badge Colors
- Debut classes metier niveau severite.

39 a 41. .severity-critical
- @apply compose des classes Tailwind rouges translucides.

43 a 45. .severity-high
- Variante orange.

47 a 49. .severity-medium
- Variante jaune.

51 a 53. .severity-low
- Variante verte.

55. commentaire Glassmorphism Card
- Debut styles cartes effet verre.

56 a 58. .glass-card
- fond semi-transparent + blur + bordure + arrondi + ombre.

60 a 62. .glass-card-hover
- herite de glass-card.
- ajoute effets hover avec couleurs soc.

64. commentaire Glow effects
- Debut classes lueur.

65 a 67. .glow-blue
- ombres externes bleues a deux intensites.

69 a 71. .glow-red
- ombres externes rouges a deux intensites.

73. commentaire Pulse animation
- Debut animation critique.

74 a 77. @keyframes critical-pulse
- alterne opacite entre 1 et 0.5.

79 a 81. .critical-pulse
- applique animation infinie 2s ease-in-out.

83. commentaire Modal overlay
- Debut style overlay modal.

84 a 86. .modal-overlay
- overlay plein ecran, centree, sombre, avec blur.

---

## 5) Fichier index.html

### Role general
Template HTML unique servi par Vite. React se monte dedans.

### Explication ligne par ligne
1. <!DOCTYPE html>
- Declare un document HTML5.

2. <html lang="en" class="dark">
- langue en anglais.
- classe dark active un theme dark base sur classe.

3. <head>
- Debut metadata.

4. <meta charset="UTF-8" />
- Encodage UTF-8.

5. <link rel="icon" type="image/svg+xml" href="/vite.svg" />
- Favicon par defaut Vite.

6. <meta name="viewport" content="width=device-width, initial-scale=1.0" />
- Responsive mobile.

7. meta description
- Description SEO du dashboard SOC.

8. <title>...</title>
- Titre onglet navigateur.

9 et 10. preconnect Google Fonts
- Optimise la connexion aux serveurs de polices.

11. link href Google Fonts Inter
- Charge la famille Inter avec plusieurs graisses.

12. </head>
- Fin en-tete.

13. <body class="bg-gray-950 text-gray-100">
- Corps avec fond sombre et texte clair.

14. <div id="root"></div>
- Point de montage React.

15. <script type="module" src="/src/main.jsx"></script>
- Charge le point d'entree JS module.

16 a 17.
- Fermeture body puis html.

---

## 6) Fichier package.json

### Role general
Manifeste du projet frontend npm.

### Explication ligne par ligne
1. {
- Debut JSON.

2. "name": "soc-assistant-frontend"
- Nom du package.

3. "private": true
- Evite publication accidentelle sur npm.

4. "version": "1.0.0"
- Version du projet.

5. "type": "module"
- Active le format ES Modules natif (import/export).

6 a 10. scripts
- dev: lance Vite en mode developpement.
- build: genere le build production.
- preview: sert localement le build genere.

11 a 19. dependencies
- axios: client HTTP.
- date-fns: utilitaires de dates.
- lucide-react: icones React.
- react, react-dom: coeur React.
- react-router-dom: routage.
- recharts: graphiques.

20 a 28. devDependencies
- @types/react et @types/react-dom: typings TS.
- @vitejs/plugin-react: support React dans Vite.
- autoprefixer et postcss: pipeline CSS.
- tailwindcss: framework utilitaire CSS.
- vite: bundler/dev server.

29. }
- Fin JSON.

---

## 7) Fichier package-lock.json

### Role general
Verrouille exactement les versions installees pour des installs reproductibles.

### Entete explique ligne par ligne (debut du fichier)
1. {
- Debut JSON.

2. "name": "soc-assistant-frontend"
- Nom du projet verrouille.

3. "version": "1.0.0"
- Version du package racine.

4. "lockfileVersion": 3
- Format lockfile npm moderne (npm 7+).

5. "requires": true
- Indique que les dependencies doivent etre resolues.

6. "packages": {
- Debut de la table des paquets resolus.

7. "": {
- Entree speciale du package racine.

8 a 10.
- name et version du root package.

11 a 18.
- dependencies directes runtime, miroir de package.json.

19 a 26.
- devDependencies directes de developpement.

### Schema repetitif de chaque dependance node_modules
Chaque bloc ressemble a:
- cle: "node_modules/nom-du-package"
- version: version finale exacte installee
- resolved: URL du tarball npm
- integrity: hash SRI pour verifier l'integrite
- dev: true si dependance de dev
- license: licence du package
- dependencies: sous-dependances immediates
- peerDependencies: contraintes de paquets attendus
- engines: version Node minimale
- funding: lien de sponsoring
- bin: executables exposes eventuellement

### Exemples concrets visibles au debut
- node_modules/@alloc/quick-lru:
  - package utilitaire en dev
  - node >= 10
- node_modules/@babel/core:
  - coeur Babel
  - depend de parser, traverse, helpers, etc.
- node_modules/@babel/parser:
  - parseur JS utilise par Babel

### Ce qu'il faut retenir
- package-lock.json ne se maintient pas a la main.
- npm install met ce fichier a jour automatiquement.
- Son role est de stabiliser la chaine de build pour tous les environnements.

---

## 8) Fichier postcss.config.js

### Role general
Configure PostCSS pour traiter les styles.

### Explication ligne par ligne
1. export default {
- Exporte la configuration (format ESM).

2. plugins: {
- Debut declaration des plugins PostCSS.

3. tailwindcss: {},
- Active le plugin Tailwind.

4. autoprefixer: {},
- Ajoute automatiquement les prefixes CSS navigateurs.

5 a 6.
- Fermeture plugins puis objet exporte.

---

## 9) Fichier tailwind.config.js

### Role general
Configure Tailwind: fichiers scannes, theme, animations, couleurs.

### Explication ligne par ligne
1. commentaire de type Tailwind Config
- Aide l'editeur avec l'autocompletion/types.

2. export default {
- Exporte la config Tailwind.

3 a 6. content
- Liste des fichiers a scanner pour extraire les classes utilitaires utilisees.
- index.html et tous les fichiers JS/TS/JSX/TSX dans src.

7. darkMode: 'class'
- Le mode sombre est pilote par une classe CSS dark.

8 a 48. theme.extend
- Etend le theme sans ecraser le theme standard.

10 a 26. colors.soc
- Palette personnalisee soc de 50 a 950.
- Utilisee dans les composants via classes Tailwind.

27 a 32. colors.severity
- Palette metier par niveau de severite.

33 a 37. animation
- Noms d'animations utilitaires:
  - pulse-glow
  - slide-in
  - fade-in

38 a 47. keyframes
- Definitions CSS des animations:
  - pulse-glow modifie box-shadow
  - slide-in anime translateX + opacite
  - fade-in anime opacite + translateY

49. plugins: []
- Aucun plugin Tailwind additionnel.

50. }
- Fin objet.

---

## 10) Fichier vite.config.js

### Role general
Configure le serveur Vite, plugin React, port, et proxy vers backend.

### Explication ligne par ligne
1. import { defineConfig } from 'vite'
- Helper de config Vite avec typing.

2. import react from '@vitejs/plugin-react'
- Plugin officiel pour React.

4. export default defineConfig({
- Exporte la configuration Vite.

5. plugins: [react()],
- Active le plugin React.

6 a 17. server
- port: 5173 pour le dev server frontend.
- proxy configure deux routes:
  - '/api' vers http://localhost:8000
    - changeOrigin true adapte l'entete Origin.
  - '/ws' vers ws://localhost:8000
    - ws true active le proxy websocket.

18. })
- Fin config.

---

## Resume fonctionnel global du frontend

- React gere l'interface et la navigation interne.
- Vite compile et sert le frontend en dev/production.
- Tailwind + CSS custom definissent le design SOC.
- api.js centralise tous les appels HTTP backend.
- package.json declare l'ecosysteme.
- package-lock.json fige les versions exactes.

Ce dossier peut servir de base pour:
- documentation technique
- soutenance
- onboarding d'un nouveau developpeur frontend
