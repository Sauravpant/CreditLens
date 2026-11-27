import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { AppStateProvider } from "./state/AppStateProvider";

const AssessPage = lazy(() => import("./features/assess/AssessPage").then((m) => ({ default: m.AssessPage })));
const ChatPage = lazy(() => import("./features/chat/ChatPage").then((m) => ({ default: m.ChatPage })));
const ModelPage = lazy(() => import("./features/model/ModelPage").then((m) => ({ default: m.ModelPage })));

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<AssessPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="model" element={<ModelPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  );
}
