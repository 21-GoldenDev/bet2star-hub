"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import useAdminRole from "@/hooks/use-admin-role";
import { useToast } from "@/hooks/use-toast";

interface OnlineUser {
  id: string;
  username: string;
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  address?: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const { roleInfo, loadingRole } = useAdminRole();
  const canModify = roleInfo?.role === "admin";

  useEffect(() => {
    fetchUsers();
  }, [roleInfo]);

  useEffect(() => {
    const fetchAgents = async () => {
      if (roleInfo?.role !== "staff" || !roleInfo.id) {
        return;
      }
      try {
        const res = await fetch(`/api/agents?staff_id=${roleInfo.id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch agents");
        }
        const data = await res.json();
        setAgents(data || []);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };

    fetchAgents();
  }, [roleInfo]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: OnlineUser) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name || "",
      email: user.email,
      password: user.password || "",
      phone: user.phone || "",
      address: user.address || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const isCreate = !selectedUser;

    if (isCreate && !formData.password.trim()) {
      toast({
        title: "Password required",
        description: "Enter a password when creating a new online user.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = isCreate ? "/api/admin/users" : `/api/users/${selectedUser.id}`;
      const method = isCreate ? "POST" : "PUT";
      const payload = { ...formData };
      if (!isCreate && !payload.password.trim()) {
        delete (payload as { password?: string }).password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || (isCreate ? "Failed to add user" : "Failed to update user"));
      }

      await fetchUsers();
      setIsDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save user";
      toast({ title: "Error", description: message, variant: "destructive" });
      console.error("Error saving user:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      await fetchUsers();
      setIsDeleteAlertOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Online Users Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage online player accounts and information
          </p>
        </div>
        {canModify && (
          <Button className="w-full md:w-auto" onClick={() => {
            setSelectedUser(null);
            setFormData({ username: "", full_name: "", email: "", password: "", phone: "", address: "" });
            setIsDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Online Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold">
            ₦{users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}
          </p>
        </Card>
        {roleInfo?.role === "staff" && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Agents Under You</p>
            <p className="text-2xl font-bold">{agents.length}</p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {agents.slice(0, 3).map((agent) => (
                <div key={agent.id} className="truncate">
                  {agent.username}
                </div>
              ))}
              {agents.length > 3 && <div>+{agents.length - 3} more</div>}
            </div>
          </Card>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or username..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No online users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  {canModify && <TableHead>Password</TableHead>}
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    {canModify && <TableCell>{user.password || "-"}</TableCell>}
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>{user.address || "-"}</TableCell>
                    <TableCell>₦{Number(user.balance).toLocaleString()}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canModify ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          disabled={isSaving || isDeleting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(user.id)}
                          disabled={isSaving || isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Read only</span>
                    )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSelectedUser(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                type="email"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            {canModify && (
              <div>
                <Label>Password</Label>
                <Input
                  value={formData.password}
                  type="text"
                  minLength={6}
                  required={!selectedUser}
                  placeholder={selectedUser ? "Leave empty to keep current password" : ""}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            )}
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            {/* Status removed — managed via profiles/roles in backend */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : selectedUser ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
