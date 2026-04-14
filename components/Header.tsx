'use client'

import { User } from "@/app/types"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

interface HeaderProps {
    user: User | null
}

const Header = ({ user }: HeaderProps) => {
    
    const pathname = usePathname();
    const navigation = [
        { name: "Home", href: "/", show: true },
        { name: "Dashboard", href: "/dashboard", show: true },
    ].filter(item => item.show);

    const getNavItemClass = (href: string) => {
        return pathname === href ? "text-blue-500" : "text-gray-700";
    }
    
    return (
        <div>
            <header className="border-b border-slate-700 px-20 py-6">
                <div className="container mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <Link href={"/"}>TeamAccess</Link>

                    {/* Navigation */}
                    <ul className="flex gap-4">
                        {navigation.map((item) => (
                            <li key={item.href}>
                                <Link href={item.href} className={getNavItemClass(item.href)}>
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="space-x-1">
                        {user ? (
                            <>
                                <span>{"userName"}</span>
                                <Button
                                    // onClick={() => Logout()}
                                >
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login">
                                    <Button>
                                        Log In
                                    </Button>
                                </Link>
                                <Link href="/auth/register">
                                    <Button>
                                        Register
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>

                </div>
            </header>
        </div>
    )
}
export default Header;