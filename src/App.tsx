import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProjectsPage } from './pages/ProjectsPage';
import { AdminConsole } from './pages/AdminConsole';
import { LogSheet } from './pages/LogSheet';
import { CorrespondencePage } from './pages/CorrespondencePage';
import './i18n';

function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <AuthProvider>
                    <ProjectProvider>
                        <Routes>
                            <Route path="/login" element={<Login />} />

                            <Route element={<Layout />}>
                                <Route path="/" element={<Dashboard />} />
                                <Route
                                    path="/architectural"
                                    element={<ProjectsPage title="Architectural Projects" type="architectural" />}
                                />
                                <Route
                                    path="/structural"
                                    element={<ProjectsPage title="Structural Projects" type="structural" />}
                                />
                                <Route
                                    path="/surveying"
                                    element={<ProjectsPage title="Surveying Projects" type="surveying" />}
                                />
                                <Route
                                    path="/electrical"
                                    element={<ProjectsPage title="Electrical Projects" type="electrical" />}
                                />
                                <Route
                                    path="/mechanical"
                                    element={<ProjectsPage title="Mechanical Projects" type="mechanical" />}
                                />
                                <Route
                                    path="/supervision/industrial"
                                    element={<ProjectsPage title="Industrial Cities Authority Projects" type="supervision-industrial" />}
                                />
                                <Route
                                    path="/supervision/client"
                                    element={<ProjectsPage title="Client Projects" type="supervision-client" />}
                                />
                                <Route
                                    path="/admin-console"
                                    element={<AdminConsole />}
                                />
                                <Route
                                    path="/log-sheet"
                                    element={<LogSheet />}
                                />
                                <Route
                                    path="/correspondence/incoming"
                                    element={<CorrespondencePage type="incoming" />}
                                />
                                <Route
                                    path="/correspondence/outgoing"
                                    element={<CorrespondencePage type="outgoing" />}
                                />
                            </Route>

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ProjectProvider>
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}

export default App;
