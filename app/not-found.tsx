import { Button } from "@/components/ui/button";
import Link from "next/link";

function NotFound() {
    return (

        <>

            <div className="flex justify-center items-center h-[90vh] gap-2 flex-col">
                
                <div className="text-2xl">
                    <h2>
                        Not Found
                    </h2>
                </div>

                <div>
                    <Link href={'/'}>
                        <Button className="text-2xl p-4">
                            Home
                        </Button>
                    </Link>
                </div>
            </div>
        </>

    )
}

export default NotFound;