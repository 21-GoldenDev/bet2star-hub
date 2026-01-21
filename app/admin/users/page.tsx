"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/admin/DataTable";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  type: "online_player" | "offline_player" | "staff";
  status: "active" | "inactive" | "suspended";
  balance: number;
  joinDate: string;
}

// Mock data - replace with real API calls
const mockUsers: User[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    type: "online_player",
    status: "active",
    balance: 45000,
    joinDate: "2024-12-01",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    type: "online_player",
    status: "active",
    balance: 120000,
    joinDate: "2024-11-15",
  },
  {
    id: 3,
    name: "Bob Johnson",
    email: "bob@example.com",
    type: "offline_player",
    status: "suspended",
    balance: 5000,
    joinDate: "2024-10-20",
  },
  {
    id: 4,
    name: "Alice Williams",
    email: "alice@example.com",
    type: "staff",
    status: "active",
    balance: 250000,
    joinDate: "2024-09-10",
  },
  {
    id: 5,
    name: "Charlie Brown",
    email: "charlie@example.com",
    type: "offline_player",
    status: "inactive",
    balance: 0,
    joinDate: "2024-08-05",
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "online_player" as "online_player" | "offline_player" | "staff",
    status: "active" as "active" | "inactive" | "suspended",
  });

  const onlineUsers = users.filter((u) => u.type === "online_player");
  const offlineUsers = users.filter((u) => u.type === "offline_player");
  const staffUsers = users.filter((u) => u.type === "staff");

  const columns = [
    { key: "name" as const, label: "Name", sortable: true },
    { key: "email" as const, label: "Email", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      render: (status: User["status"]) => (
        <Badge
          variant={
            status === "active"
              ? "default"
              : status === "suspended"
              ? "destructive"
              : "secondary"
          }
          className="capitalize"
        >
          {status}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: "balance" as const,
      label: "Balance",
      render: (balance: number) => `₦${Number(balance).toLocaleString()}`,
      sortable: true,
    },
    { key: "joinDate" as const, label: "Join Date", sortable: true },
  ];

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      type: user.type,
      status: user.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedUser) {
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? { ...u, ...formData }
            : u
        )
      );
      setIsEditDialogOpen(false);
    }
  };

  const openDeleteDialog = (userId: number) => {
    setUserToDelete(userId);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = () => {
    if (userToDelete === null) return;

    setUsers(users.filter((u) => u.id !== userToDelete));
    setIsDeleteAlertOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts and permissions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input placeholder="user@example.com" type="email" />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input placeholder="John Doe" />
              </div>
              <div>
                <Label>User Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online_player">Online Players</SelectItem>
                    <SelectItem value="offline_player">Offline Players</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Online Players</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.type === "online_player").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Offline Players</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.type === "offline_player").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Staff</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.type === "staff").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold">
            ₦{users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Users Tabs */}
      <Tabs defaultValue="online" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger className="cursor-pointer" value="online">Online Players</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="offline">Offline Players</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          <DataTable<User>
            columns={columns}
            data={onlineUsers}
            searchKey="email"
            searchPlaceholder="Search by email or name..."
            actions={(user) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => openDeleteDialog(user.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="offline">
          <DataTable<User>
            columns={columns}
            data={offlineUsers}
            searchKey="email"
            searchPlaceholder="Search by email or name..."
            actions={(user) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => openDeleteDialog(user.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="staff">
          <DataTable<User>
            columns={columns}
            data={staffUsers}
            searchKey="email"
            searchPlaceholder="Search by email or name..."
            actions={(user) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => openDeleteDialog(user.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
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
            <div>
              <Label>User Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online_player">Online Players</SelectItem>
                  <SelectItem value="offline_player">Offline Players</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Save Changes
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
