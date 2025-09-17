export interface Skill {
    category: string;
    items: string[];
}

export interface Experience {
    title: string;
    company: string;
    location: string;
    period: string;
    details: string[];
}

export interface Education {
    institution: string;
    location?: string;
    degree: string;
    period: string;
    cgpa?: number;
}

export interface Project {
    title: string;
    link: string;
    tech: string;
    description: string;
}

export interface Resume {
    name: string;
    role?: string;
    location?: string;
    contact: string;
    summary?: string;
    skills: Skill[];  // updated
    experience: Experience[];
    education: Education[];
    projects: Project[];
    honors?: string[];
}
