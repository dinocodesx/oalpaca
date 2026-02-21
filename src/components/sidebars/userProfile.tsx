import "./userProfile.css";

interface UserProfileProps {
  avatarUrl: string;
  username: string;
}

export default function UserProfile({ avatarUrl, username }: UserProfileProps) {
  return (
    <div className="user-profile">
      <div className="user-profile-avatar-wrapper">
        <img
          className="user-profile-avatar"
          src={avatarUrl}
          alt={username}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <span className="user-profile-name">{username}</span>
    </div>
  );
}
