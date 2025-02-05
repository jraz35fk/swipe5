import Link from 'next/link';

const NavBar = () => {
  return (
    <nav className="navbar">
      <Link href="/"><a>Home</a></Link>
      <Link href="/favorites"><a>Favorites</a></Link>
      <Link href="/profile"><a>Profile</a></Link>
      <Link href="/friends"><a>Friends</a></Link>
    </nav>
  );
};

export default NavBar;
