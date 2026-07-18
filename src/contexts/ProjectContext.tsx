import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Define Project Types
export type ProjectType = 'architectural' | 'structural' | 'surveying' | 'electrical' | 'mechanical' | 'supervision-industrial' | 'supervision-client';
export type ProjectStatus = 'active' | 'completed' | 'on-hold';

export interface Project {
    id: string;
    name: string;
    client: string;
    location: string;
    year: string;
    type: ProjectType;
    status: ProjectStatus;
    clientPhone?: string;
    refNumber?: string;
    progress?: number;
    oneDriveLink?: string;
    imageUrl?: string;
    monthlyReportLink?: string;
    createdAt: string;
}

interface ProjectContextType {
    projects: Project[];
    error: string | null;
    loading: boolean;
    addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<Project | null>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<boolean>;
    deleteProject: (id: string) => Promise<boolean>;
    getProjectsByType: (type: ProjectType) => Project[];
    getRecentProjects: (limit?: number) => Project[];
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Use relative path for production (Hostinger) which acts as same-origin
const API_URL = import.meta.env.PROD
    ? '/api/projects'
    : `http://${window.location.hostname}:3001/api/projects`;

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, isAuthenticated } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchProjects();
        } else {
            setProjects([]);
            setLoading(false);
        }
    }, [token, isAuthenticated]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const storedToken = token || localStorage.getItem('token');
            if (!storedToken) {
                setLoading(false);
                return;
            }
            const response = await fetch(API_URL, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch projects');
            const data = await response.json();
            // Ensure status has a default
            const normalized = data.map((p: Project) => ({
                ...p,
                status: p.status || 'active',
            }));
            setProjects(normalized);
        } catch (err) {
            console.error(err);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const addProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project | null> => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...projectData,
                    status: projectData.status || 'active',
                    createdAt: new Date().toISOString()
                })
            });
            if (!response.ok) throw new Error('Failed to create project');
            const newProject: Project = await response.json();
            setProjects(prev => [{ ...newProject, status: newProject.status || 'active' }, ...prev]);
            return newProject;
        } catch (err) {
            console.error(err);
            setError('Failed to add project');
            return null;
        }
    };

    const updateProject = async (id: string, updates: Partial<Project>): Promise<boolean> => {
        try {
            const oldProjects = [...projects];
            setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                setProjects(oldProjects);
                throw new Error('Failed to update project');
            }
            return true;
        } catch (err) {
            console.error(err);
            setError('Failed to update project');
            return false;
        }
    };

    const deleteProject = async (id: string): Promise<boolean> => {
        try {
            const oldProjects = [...projects];
            setProjects(prev => prev.filter(p => p.id !== id));

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                setProjects(oldProjects);
                throw new Error('Failed to delete project');
            }
            return true;
        } catch (err) {
            console.error(err);
            setError('Failed to delete project');
            return false;
        }
    };

    const getProjectsByType = (type: ProjectType) => {
        return projects.filter(p => p.type === type);
    };

    const getRecentProjects = (limit = 5) => {
        return [...projects]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    };

    return (
        <ProjectContext.Provider value={{
            projects,
            error,
            loading,
            addProject,
            updateProject,
            deleteProject,
            getProjectsByType,
            getRecentProjects,
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
