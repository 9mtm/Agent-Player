'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Mail, Shield, Crown, User, Eye, Trash2, Settings, Check, X, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { toast } from "sonner";

const BACKEND_URL = config.backendUrl;

// Helper to get auth headers
function authHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

// Role definitions
const roles = {
    owner: {
        name: "Owner",
        icon: Crown,
        color: "text-yellow-500",
        description: "Full access to all features and settings",
        permissions: ["all"],
    },
    admin: {
        name: "Admin",
        icon: Shield,
        color: "text-blue-500",
        description: "Manage team members, settings, and workflows",
        permissions: ["manage_team", "manage_settings", "manage_workflows", "view_sensitive"],
    },
    user: {
        name: "User",
        icon: User,
        color: "text-green-500",
        description: "Use agent features and workflows",
        permissions: ["use_agent", "create_workflows", "view_data"],
    },
    guest: {
        name: "Guest",
        icon: Eye,
        color: "text-gray-500",
        description: "View-only access to non-sensitive data",
        permissions: ["view_data"],
    },
};

export default function TeamPage() {
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("user");
    const [isInviting, setIsInviting] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamDescription, setNewTeamDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    useEffect(() => {
        loadTeams();
    }, []);

    useEffect(() => {
        if (selectedTeam) {
            loadMembers();
            loadInvitations();
        }
    }, [selectedTeam]);

    const loadTeams = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/team`, {
                headers: authHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setTeams(data.teams || []);
                if (data.teams && data.teams.length > 0) {
                    setSelectedTeam(data.teams[0]);
                }
            }
        } catch (error) {
            console.error('Error loading teams:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMembers = async () => {
        if (!selectedTeam) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/team/${selectedTeam.id}/members`, {
                headers: authHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setMembers(data.members || []);
            }
        } catch (error) {
            console.error('Error loading members:', error);
        }
    };

    const loadInvitations = async () => {
        if (!selectedTeam) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/team/${selectedTeam.id}/invitations`, {
                headers: authHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setInvitations(data.invitations || []);
            }
        } catch (error) {
            console.error('Error loading invitations:', error);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !selectedTeam) return;

        setIsInviting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/team/${selectedTeam.id}/invite`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            if (response.ok) {
                toast.success('Invitation sent successfully!');
                setInviteEmail("");
                setIsInviteDialogOpen(false);
                loadInvitations();
            } else {
                const error = await response.json();
                toast.error(`Failed to send invitation: ${error.error}`);
            }
        } catch (error) {
            toast.error('Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!selectedTeam) return;
        if (!confirm('Remove this member from the team?')) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/team/${selectedTeam.id}/members/${userId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (response.ok) {
                toast.success('Member removed successfully');
                loadMembers();
            } else {
                const error = await response.json();
                toast.error(error.error);
            }
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/team/invitations/${invitationId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (response.ok) {
                toast.success('Invitation cancelled');
                loadInvitations();
            }
        } catch (error) {
            toast.error('Failed to cancel invitation');
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            toast.error('Please enter a team name');
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/team`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    name: newTeamName.trim(),
                    description: newTeamDescription.trim() || undefined,
                }),
            });

            if (response.ok) {
                toast.success('Team created successfully!');
                setNewTeamName("");
                setNewTeamDescription("");
                setIsCreateDialogOpen(false);
                await loadTeams();
            } else {
                const error = await response.json();
                toast.error(`Failed to create team: ${error.error}`);
            }
        } catch (error) {
            toast.error('Failed to create team');
        } finally {
            setIsCreating(false);
        }
    };

    const getRoleInfo = (role: string) => {
        return roles[role as keyof typeof roles] || roles.user;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                        <p className="text-muted-foreground text-center mb-6">
                            You are not part of any team. Create your first team to get started.
                        </p>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Create Team
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Team</DialogTitle>
                                    <DialogDescription>
                                        Create a team to collaborate with others
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="team-name">Team Name</Label>
                                        <Input
                                            id="team-name"
                                            type="text"
                                            placeholder="Engineering Team"
                                            value={newTeamName}
                                            onChange={(e) => setNewTeamName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="team-description">Description (Optional)</Label>
                                        <Input
                                            id="team-description"
                                            type="text"
                                            placeholder="Our amazing team"
                                            value={newTeamDescription}
                                            onChange={(e) => setNewTeamDescription(e.target.value)}
                                        />
                                    </div>

                                    <Button className="w-full" onClick={handleCreateTeam} disabled={isCreating}>
                                        {isCreating ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                                        ) : (
                                            <><Users className="mr-2 h-4 w-4" /> Create Team</>
                                        )}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
                    <p className="text-muted-foreground">
                        {selectedTeam?.name} - {members.length} members
                    </p>
                </div>
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                                Send an invitation to join {selectedTeam?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="colleague@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="guest">Guest</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {getRoleInfo(inviteRole).description}
                                </p>
                            </div>

                            <Button className="w-full" onClick={handleInvite} disabled={isInviting}>
                                {isInviting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                ) : (
                                    <><Mail className="mr-2 h-4 w-4" /> Send Invitation</>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Team Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Members
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{members.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active team members
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Admins
                        </CardTitle>
                        <Shield className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {members.filter(m => m.role === 'admin').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Team administrators
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Users
                        </CardTitle>
                        <User className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {members.filter(m => m.role === 'user').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Regular users
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pending
                        </CardTitle>
                        <Mail className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {invitations.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pending invitations
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Team Members List */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        Manage your team members and their roles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => {
                            const roleInfo = getRoleInfo(member.role);
                            const RoleIcon = roleInfo.icon;

                            return (
                                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={member.avatar} alt={member.name} />
                                            <AvatarFallback>
                                                {member.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1">
                                            <p className="font-medium">{member.name}</p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Joined {new Date(member.joined_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <RoleIcon className={`h-4 w-4 ${roleInfo.color}`} />
                                            <span className="text-sm font-medium">{roleInfo.name}</span>
                                        </div>

                                        {member.role !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveMember(member.user_id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Invitations</CardTitle>
                        <CardDescription>
                            Invitations waiting for acceptance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {invitations.map((invitation) => (
                                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{invitation.email}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Invited as {invitation.role} • {new Date(invitation.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCancelInvitation(invitation.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Roles & Permissions */}
            <Card>
                <CardHeader>
                    <CardTitle>Roles & Permissions</CardTitle>
                    <CardDescription>
                        Overview of available roles and their permissions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(roles).map(([key, role]) => {
                            const RoleIcon = role.icon;
                            return (
                                <div key={key} className="p-4 border rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <RoleIcon className={`h-5 w-5 mt-0.5 ${role.color}`} />
                                        <div className="flex-1">
                                            <h4 className="font-semibold">{role.name}</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {role.description}
                                            </p>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Permissions:
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {role.permissions.map((permission) => (
                                                        <Badge key={permission} variant="secondary" className="text-xs">
                                                            <Check className="mr-1 h-3 w-3" />
                                                            {permission.replace(/_/g, ' ')}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
