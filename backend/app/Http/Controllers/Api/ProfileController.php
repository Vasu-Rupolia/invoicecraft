<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'avatar' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:4096',
            ],
        ]);

        unset($data['avatar']);

        $oldAvatar = $user->avatar_path;
        $newAvatar = null;

        if ($request->hasFile('avatar')) {
            $newAvatar = $request->file('avatar')
                ->store('user-avatars', 'public');

            $user->avatar_path = $newAvatar;
        }

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->save();

        if ($newAvatar && $oldAvatar) {
            Storage::disk('public')->delete($oldAvatar);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);

            $user->avatar_path = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Profile photo removed successfully.',
            'user' => $user->fresh(),
        ]);
    }
}