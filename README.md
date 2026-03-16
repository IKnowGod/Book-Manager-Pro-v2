# 📖 Book Manager Pro v2

A premium, AI-augmented management suite for authors and novelists. Built with a stunning **dark glassmorphism** interface, Book Manager Pro v2 doesn't just store your notes—it understands them.

![Project Preview](https://via.placeholder.com/1200x600?text=Book+Manager+Pro+v2+UI+Preview)

## ✦ The AI Core

The "Pro" in version 2 comes from a deeply integrated AI engine that acts as your developmental editor, continuity checker, and research assistant.

### 🔍 Intelligent Continuity Editor
Never forget a character's eye color again. Our AI scanner cross-references every new note against your entire book's history to detect contradictions (e.g., "Alex had brown eyes in Chapter 1, but they are blue here"). 
- **Direct Navigation**: Clicking an inconsistency takes you directly to the source note and highlights the conflicting text.

### 🧪 Advanced Authoring Suite
- **Beta Reader Simulator**: Get instant, objective feedback on your latest chapter's strengths, weaknesses, and emotional impact.
- **Pacing Analysis**: Visualize the intensity and flow of your narrative with AI-generated pacing scores per chapter.
- **Plot Hole Scanner (Loose End Scanner)**: Identifies unresolved plot threads or forgotten promises to ensure a satisfying conclusion.

### 📊 Narrative & Thematic Analysis
- **Interaction Mapping**: Automatically identifies character dialogue and meaningful interactions.
- **Thematic Matrix**: Scans your entire work to map the progression of primary themes (e.g., Betrayal, Redemption) across your chapters.
- **Chapter Timeline**: Visual presence tracking for characters and tags.

### 🛡️ AI Model Fallback Chain
Reliability is key for authors. The backend supports a prioritized chain of AI models (Gemini, OpenAI, etc.). If one provider hits a rate limit or quota issue, the system automatically falls back to the next model in your list without interrupting your workflow.

---

## 🛠️ Technical Architecture

### Frontend
- **Framework**: React 18 + Vite + TypeScript.
- **Styling**: Premium Dark Glassmorphism (Vanilla CSS).
- **Visualizations**: Recharts for data-driven narrative insights.
- **State Management**: Modern React hooks and optimized API client.

### Backend
- **Core**: Node.js + Express + TypeScript.
- **Database**: Prisma ORM with SQLite (Fast, local, and robust).
- **AI Integration**: Custom provider abstraction for Google Gemini and OpenAI.
- **Validation**: Zod for type-safe API boundaries.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the Repo**
   ```bash
   git clone https://github.com/your-repo/book-manager-pro-v2.git
   cd book-manager-pro-v2
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env.local
   # Add your GEMINI_API_KEY to .env.local
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the App**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📝 Project Culture
This project follows a strict documentation protocol. Every major architectural change is documented in `ai-workflows/` and summarized in `PROJECT_NOTES.md`.

*Built for writers who demand precision.*
