"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

export type UserFormData = {
  name: string;
  its: number;
  password?: string;
  confirmPassword?: string;
  phoneOrEmail?: string;
  role: "admin" | "cook" | "volunteer";
};

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: initialData?.name || "",
    its: initialData?.its || 0,
    password: "",
    confirmPassword: "",
    phoneOrEmail: initialData?.phoneOrEmail || "",
    role: initialData?.role || "cook",
  });
  const [error, setError] = useState<string | null>(null);
  const [itsError, setItsError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateITS = async (its: number) => {
    if (isEdit || its <= 0) return;

    try {
      const res = await fetch("/api/admin/users/check-its", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ its }),
      });

      const data = await res.json();
      if (data.exists) {
        setItsError("This ITS number is already registered");
      } else {
        setItsError(null);
      }
    } catch (err) {
      console.error("Error checking ITS:", err);
    }
  };

  const validatePassword = (password: string) => {
    if (!password && isEdit) return true;
    if (!password) return false;

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!isEdit && formData.its <= 0) {
      setError("Valid ITS number is required");
      return;
    }

    if (itsError) {
      setError("Please fix the ITS number error");
      return;
    }

    if (!isEdit) {
      if (!validatePassword(formData.password || "")) {
        setError("Please fix the password errors");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isEdit ? "Edit User" : "Create New User"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">
              Full Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
              className="h-14 text-base"
              required
            />
          </div>

          {/* ITS Number */}
          <div className="space-y-2">
            <Label htmlFor="its" className="text-base">
              ITS Number *
            </Label>
            <Input
              id="its"
              type="number"
              inputMode="numeric"
              value={formData.its || ""}
              onChange={(e) => {
                const its = Number.parseInt(e.target.value, 10) || 0;
                setFormData({ ...formData, its });
              }}
              onBlur={(e) => {
                const its = Number.parseInt(e.target.value, 10) || 0;
                validateITS(its);
              }}
              disabled={isLoading || isEdit}
              className="h-14 text-base"
              required
              readOnly={isEdit}
            />
            {itsError && (
              <p className="text-sm text-red-600">{itsError}</p>
            )}
            {isEdit && (
              <p className="text-sm text-slate-600">
                ITS number cannot be changed
              </p>
            )}
          </div>

          {/* Password (only for create) */}
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    validatePassword(e.target.value);
                  }}
                  disabled={isLoading}
                  className="h-14 text-base"
                  required
                />
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
                <p className="text-sm text-slate-600">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base">
                  Confirm Password *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  className="h-14 text-base"
                  required
                />
              </div>
            </>
          )}

          {/* Phone/Email */}
          <div className="space-y-2">
            <Label htmlFor="phoneOrEmail" className="text-base">
              Phone or Email
            </Label>
            <Input
              id="phoneOrEmail"
              type="text"
              value={formData.phoneOrEmail}
              onChange={(e) =>
                setFormData({ ...formData, phoneOrEmail: e.target.value })
              }
              disabled={isLoading}
              className="h-14 text-base"
              placeholder="Optional"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-base">
              Role *
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) =>
                setFormData({ ...formData, role: value })
              }
              disabled={isLoading}
              required
            >
              <SelectTrigger id="role" className="h-14 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="text-base">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Admin</Badge>
                    <span>- Full system access</span>
                  </div>
                </SelectItem>
                <SelectItem value="cook" className="text-base">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Cook</Badge>
                    <span>- Build ingredient carts</span>
                  </div>
                </SelectItem>
                <SelectItem value="volunteer" className="text-base">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Volunteer</Badge>
                    <span>- View shopping lists</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !!itsError}
              className="h-14 flex-1 text-base font-medium"
            >
              {isLoading
                ? "Saving..."
                : isEdit
                ? "Update User"
                : "Create User"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onCancel}
                disabled={isLoading}
                className="h-14 flex-1 text-base font-medium"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
